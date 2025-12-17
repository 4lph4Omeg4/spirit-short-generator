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
        });

        // Client for Text (Gateway -> Perplexity)
        const textClient = new OpenAI({
            apiKey: gatewayToken || openaiKey,
            baseURL: gatewayUrl,
            defaultHeaders: gatewayToken ? {
                'Authorization': `Bearer ${gatewayToken}`
            } : {},
        });

        // 4. Research Fallback for Transcript
        if (!transcript || transcript.includes("simulated transcript")) {
            console.log("Transcript missing or mock. Researching video content with Perplexity...");
            try {
                const researchRes = await textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a video researcher. Find the core message and main points of the YouTube video provided. Research the web if needed.' },
                        { role: 'user', content: `What are the main points and the core spiritual/philosophical message of this video: ${url}? Title: ${metadata.title}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } });

                transcript = researchRes.choices[0]?.message?.content || transcript;
                console.log("Research successful. Content fetched.");
            } catch (researchError) {
                console.error("Research failed:", researchError);
            }
        }

        // 5. AI Generation Logic
        console.log("Starting AI Generation with Perplexity...");

        try {
            // Run generations in parallel
            const [structuredRes, spiritualRes, quoteRes, imagePromptRes] = await Promise.all([
                // 1. Structured Summary
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY a bulleted list of 3 points. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Summarize this text into 3 bullet points:\n\n${transcript.slice(0, 30000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => cleanSummary(res.choices[0]?.message?.content || "")),

                // 2. Spiritual Essence
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the spiritual essence text. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Rewrite the soul of this message into a poetic spiritual essence:\n\n${transcript.slice(0, 30000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => cleanText(res.choices[0]?.message?.content || "")),

                // 3. Quote
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the quote text. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Extract the single best short quote from this text:\n\n${transcript.slice(0, 30000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => cleanText(res.choices[0]?.message?.content || "")),

                // 4. Visual Prompt
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the image description. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Describe an abstract, cinematic, spiritual background image (9:16 aspect ratio) based on this text:\n\n${transcript.slice(0, 30000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => cleanText(res.choices[0]?.message?.content || "")),
            ]);

            console.log("Generation Complete.");

            summaries = {
                structured: structuredRes,
                spiritual: spiritualRes,
                quote: quoteRes,
                image_prompt: imagePromptRes,
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"
            };

            // 6. Generate Image (Using Vercel Managed AI / Gateway Credits)
            // Note: Managed models use the OpenAI-compatible endpoint regardless of provider
            try {
                console.log("Attempting Image Generation via Vercel Managed AI (Imagen 4)...");
                const managedClient = createOpenAI({
                    apiKey: gatewayToken,
                    baseURL: gatewayUrl,
                });

                const { image } = await experimental_generateImage({
                    model: managedClient.image('google/imagen-4.0-generate'),
                    prompt: `9:16 aspect ratio. Cinematic spiritual background, ethereal, high quality, 8k resolution. Focus on: ${summaries.image_prompt}`,
                });

                if (image && image.base64) {
                    summaries.image_url = `data:image/png;base64,${image.base64}`;
                    console.log("Gateway Managed Google Success.");
                } else if (image && image.uint8Array) {
                    summaries.image_url = `data:image/png;base64,${Buffer.from(image.uint8Array).toString('base64')}`;
                    console.log("Gateway Managed Google Success (uint8).");
                }
            } catch (imgError) {
                console.warn("Managed Google failed, attempting Managed DALL-E 3 fallback...", imgError);
                try {
                    const managedClient = createOpenAI({
                        apiKey: gatewayToken,
                        baseURL: gatewayUrl,
                    });

                    const { image } = await experimental_generateImage({
                        model: managedClient.image('openai/dall-e-3'),
                        prompt: `9:16 aspect ratio. Cinematic spiritual background, ethereal, high quality, 8k resolution. Focus on: ${summaries.image_prompt}`,
                    });

                    if (image && image.base64) {
                        summaries.image_url = `data:image/png;base64,${image.base64}`;
                        console.log("Gateway Managed DALL-E 3 Success.");
                    } else if (image && image.uint8Array) {
                        summaries.image_url = `data:image/png;base64,${Buffer.from(image.uint8Array).toString('base64')}`;
                        console.log("Gateway Managed DALL-E 3 Success (uint8).");
                    }
                } catch (managedError) {
                    console.warn("All Managed Image Generation Failed:", managedError);
                    // Fallback URL is already set
                }
            }

        } catch (genError) {
            console.error("Critical Generation Error:", genError);
            summaries = {
                structured: "Generation failed due to API issues. Please check your Gateway configurations.",
                spiritual: "The soul of this video could not be processed at this time.",
                quote: "Spirit moves in mysterious ways.",
                image_prompt: "Abstract light.",
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"
            };
        }

        // 7. Save to Supabase
        try {
            console.log("Saving to Supabase...");
            const { data, error } = await supabase
                .from('videos')
                .insert([
                    {
                        video_url: url,
                        title: metadata.title,
                        channel_name: metadata.author_name,
                        transcript: transcript.substring(0, 10000), // Trim for DB
                        summary_structured: summaries.structured,
                        spiritual_essence: summaries.spiritual,
                        quote: summaries.quote,
                        image_prompt: summaries.image_prompt,
                        image_url: summaries.image_url,
                    }
                ])
                .select();

            if (error) console.error("Supabase Error:", error);
            else console.log("Saved.");
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
