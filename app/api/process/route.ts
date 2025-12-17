import { NextResponse } from 'next/server';
import { getVideoMetadata, getTranscript } from '@/lib/youtube';
import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
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
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Get Metadata
        const metadata = await getVideoMetadata(url);

        // 2. Get Transcript
        let transcript = await getTranscript(url);
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

        // We'll run these in parallel for speed
        let summaries;
        try {
            console.log("Starting AI Generation...");

            const [structuredRes, spiritualRes, quoteRes, imagePromptRes] = await Promise.all([
                // 1. Structured Summary (Perplexity)
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY a bulleted list of 3 points. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Summarize this text into 3 bullet points:\n\n${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Structured Summary Done"); return cleanSummary(res.choices[0]?.message?.content || ""); }),

                // 2. Spiritual Essence (Perplexity)
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the spiritual essence text. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Rewrite the soul of this message into a poetic spiritual essence:\n\n${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Spiritual Essence Done"); return cleanText(res.choices[0]?.message?.content || ""); }),

                // 3. Quote (Perplexity)
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the quote text. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Extract the single best short quote from this text:\n\n${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Quote Done"); return cleanText(res.choices[0]?.message?.content || ""); }),

                // 4. Visual Prompt (Perplexity)
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'Output ONLY the image description. NO intro. NO outro. NO citations.' },
                        { role: 'user', content: `Describe an abstract, cinematic, spiritual background image (9:16) based on this text:\n\n${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Visual Prompt Done"); return cleanText(res.choices[0]?.message?.content || ""); }),
            ]);

            console.log("Text Generation Complete. Starting Image Generation...");

            // 5. Generate Image (Google Imagen 3) - Via Gateway Image Generation
            let imageUrl = null;
            try {
                console.log("Generating image with google/imagen-3 (Images Generate)...");

                const imageResponse = await textClient.images.generate({
                    model: 'dall-e-3',
                    prompt: `Vertical 9:16 aspect ratio. Spiritual, ethereal, cinematic, 8k resolution. ${imagePromptRes}`,
                    n: 1,
                    size: "1024x1792",
                }, { headers: { 'X-Vercel-AI-Provider': 'openai' } });

                console.log("Imagen 3 Response:", JSON.stringify(imageResponse, null, 2));

                if (imageResponse.data && imageResponse.data[0] && imageResponse.data[0].url) {
                    imageUrl = imageResponse.data[0].url;
                    console.log("Extracted Image URL from Imagen 3:", imageUrl);
                } else if (imageResponse.data && imageResponse.data[0] && imageResponse.data[0].b64_json) {
                    imageUrl = `data:image/png;base64,${imageResponse.data[0].b64_json}`;
                    console.log("Extracted Base64 from Imagen 3");
                } else {
                    console.log("No image URL found in Imagen 3 response.");
                    imageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop";
                }

            } catch (imgError: any) {
                console.error("Image generation failed:", JSON.stringify(imgError, null, 2));
                imageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"; // Fallback
            }

            if (!imageUrl) {
                console.log("No image found in response content.");
                imageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop";
            }



            summaries = {
                structured: structuredRes,
                spiritual: spiritualRes,
                quote: quoteRes,
                image_url: imageUrl,
                image_prompt: imagePromptRes
            };

            // 6. Save to Supabase
            try {
                console.log("Saving to Supabase... Payload (truncated):", {
                    ...summaries,
                    image_url: summaries.image_url?.substring(0, 50) + "..."
                });

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

        } catch (aiError) {
            console.error("FULL AI ERROR:", aiError);
            summaries = {
                structured: "AI Generation Failed (Check Server Logs). Mock: The video covers three main points: 1. The importance of mindfulness. 2. How to practice daily gratitude. 3. The connection between inner peace and outer reality.",
                spiritual: "AI Generation Failed. Mock: At its core, this message invites you to return to the sanctuary of your own heart.",
                quote: "The universe is not outside of you.",
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop",
                image_prompt: "A mock spiritual background."
            };

            // Attempt to save the error state to Supabase so we can see it in the DB too
            try {
                await supabase.from('videos').insert([{
                    video_url: url,
                    title: metadata.title,
                    channel_name: metadata.author_name,
                    transcript: transcript,
                    summary_structured: summaries.structured,
                    spiritual_essence: summaries.spiritual,
                    quote: summaries.quote,
                    image_prompt: summaries.image_prompt,
                    image_url: summaries.image_url,
                }]);
            } catch (e) { console.error("Failed to save error state to DB", e); }
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
