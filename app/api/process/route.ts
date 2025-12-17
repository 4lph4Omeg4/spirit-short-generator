import { NextResponse } from 'next/server';
import { getVideoMetadata, getTranscript } from '@/lib/youtube';
import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, experimental_generateImage } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';

// Helper to clean AI output
function cleanText(text: string): string {
    if (!text) return "";
    // 1. Remove conversational prefixes
    let cleaned = text
        .replace(/^Here is.*?:\s*/i, "")
        .replace(/^Based on.*?:\s*/i, "")
        .replace(/^Sure.*?:\s*/i, "")
        .replace(/^The quote is.*?:\s*/i, "")
        .replace(/^The essence is.*?:\s*/i, "")
        .replace(/^"|"$/g, "") // Remove surrounding quotes first
        .trim();

    // 2. Remove conversational suffixes/explanations
    cleaned = cleaned
        .replace(/\s*This quote captures[\s\S]*$/i, "")
        .replace(/\s*This reflects[\s\S]*$/i, "")
        .replace(/\s*In this passage[\s\S]*$/i, "")
        .replace(/\[\d+\]/g, "")
        .trim();

    return cleaned;
}

// Specialized cleaner for the summary to keep bullets but remove filler
function cleanSummary(text: string): string {
    if (!text) return "";
    let cleaned = text
        .replace(/^Here is.*?:\s*/i, "")
        .replace(/^Based on.*?:\s*/i, "")
        .replace(/\[\d+\]/g, "")
        .trim();
    return cleaned;
}

export async function POST(req: Request) {
    let url: string | undefined;
    let metadata: any;
    let transcript: string = "";
    let summaries: any;

    try {
        const json = await req.json();
        url = json.url;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Get Metadata
        try {
            metadata = await getVideoMetadata(url as string);
        } catch (e) {
            console.error("Metadata fetch failed", e);
            throw e; // Critical error, let outer catch handle it
        }

        // 2. Get Transcript
        try {
            transcript = (await getTranscript(url as string)) || "";
        } catch (e) {
            console.error("Transcript fetch error", e);
        }

        if (!transcript) {
            console.log("Transcript not found, using mock fallback");
            transcript = "This is a simulated transcript. The video explores the depths of consciousness and the interconnectedness of all things. It speaks to the journey of the soul through time and space, seeking the ultimate truth of existence.";
        }

        // 3. Configure Clients
        const gatewayUrl = process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1';
        const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_TOKEN;
        const openaiKey = process.env.OPENAI_API_KEY;

        console.log("API Config:", {
            GatewayUrl: gatewayUrl,
            GatewayToken: gatewayToken ? "Present" : "Missing",
            OpenAIKey: openaiKey ? "Present" : "Missing"
        });

        // Client for Text (Gateway -> Perplexity)
        const textClient = new OpenAI({
            apiKey: gatewayToken || openaiKey,
            baseURL: gatewayUrl,
            defaultHeaders: gatewayToken ? {
                'Authorization': `Bearer ${gatewayToken}`
            } : {},
        });

        // AI Generation Logic
        const googleProvider = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
        });

        console.log("Starting AI Generation with Gemini...");

        try {
            // Run text generations in parallel with Google
            const [structuredRes, spiritualRes, quoteRes, imagePromptRes] = await Promise.all([
                // 1. Structured Summary
                generateText({
                    model: googleProvider('gemini-1.5-flash'),
                    system: 'Output ONLY a bulleted list of 3 points. NO intro. NO outro.',
                    prompt: `Summarize this text into 3 bullet points:\n\n${transcript.slice(0, 50000)}`
                }).then(res => cleanSummary(res.text)),

                // 2. Spiritual Essence
                generateText({
                    model: googleProvider('gemini-1.5-flash'),
                    system: 'Output ONLY the spiritual essence text. NO intro. NO outro.',
                    prompt: `Rewrite the soul of this message into a poetic spiritual essence:\n\n${transcript.slice(0, 50000)}`
                }).then(res => cleanText(res.text)),

                // 3. Quote
                generateText({
                    model: googleProvider('gemini-1.5-flash'),
                    system: 'Output ONLY the quote text. NO intro. NO outro.',
                    prompt: `Extract the single best short quote from this text:\n\n${transcript.slice(0, 50000)}`
                }).then(res => cleanText(res.text)),

                // 4. Visual Prompt
                generateText({
                    model: googleProvider('gemini-1.5-flash'),
                    system: 'Output ONLY the image description. NO intro. NO outro.',
                    prompt: `Describe an abstract, cinematic, spiritual background image (9:16 aspect ratio) based on the core energy of this text:\n\n${transcript.slice(0, 50000)}`
                }).then(res => cleanText(res.text)),
            ]);

            console.log("Text Generation Complete.");

            summaries = {
                structured: structuredRes,
                spiritual: spiritualRes,
                quote: quoteRes,
                image_prompt: imagePromptRes,
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop" // Initial fallback
            };
        } catch (textError) {
            console.error("Text Generation Error:", textError);
            summaries = {
                structured: "The video covers three main points: 1. The importance of mindfulness. 2. How to practice daily gratitude. 3. The connection between inner peace and outer reality.",
                spiritual: "At its core, this message invites you to return to the sanctuary of your own heart.",
                quote: "The universe is not outside of you.",
                image_prompt: "An abstract spiritual background.",
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"
            };
        }

        // 5. Generate Image (Google Imagen 3)
        try {
            console.log("Generating image with imagen-3.0-generate-002...");
            const { image } = await experimental_generateImage({
                model: googleProvider.image('imagen-3.0-generate-002'),
                prompt: `Vertical 9:16 aspect ratio. Spiritual, ethereal, cinematic, 8k resolution. ${summaries.image_prompt}`,
            });

            if (image && image.base64) {
                summaries.image_url = `data:image/png;base64,${image.base64}`;
                console.log("Extracted Base64 from Google Imagen 3");
            } else if (image && image.uint8Array) {
                const base64 = Buffer.from(image.uint8Array).toString('base64');
                summaries.image_url = `data:image/png;base64,${base64}`;
                console.log("Converted Uint8Array to Base64");
            }
        } catch (imgError: any) {
            console.error("Image generation failed:", imgError);
        }

        // 6. Save to Supabase
        try {
            console.log("Saving to Supabase...");
            const { data, error } = await supabase
                .from('videos')
                .insert([
                    {
                        video_url: url,
                        title: metadata.title,
                        channel_name: metadata.author_name,
                        transcript: transcript,
                        summary_structured: summaries.structured,
                        spiritual_essence: summaries.spiritual,
                        quote: summaries.quote,
                        image_prompt: summaries.image_prompt,
                        image_url: summaries.image_url,
                    }
                ])
                .select();

            if (error) {
                console.error("Supabase Insert Error:", error);
            } else {
                console.log("Saved to Supabase:", data);
            }
        } catch (dbError) {
            console.error("Supabase Save Failed:", dbError);
        }

        return NextResponse.json({
            metadata,
            transcript,
            summaries
        });

    } catch (error) {
        console.error('Error processing video:', error);
        return NextResponse.json({ error: 'Failed to process video' }, { status: 500 });
    }
}
