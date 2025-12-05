import { NextResponse } from 'next/server';
import { getVideoMetadata, getTranscript } from '@/lib/youtube';
import OpenAI from 'openai';

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

        // Client for Images (Direct OpenAI) - Bypass Gateway to avoid 404s
        const imageClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // Must use direct OpenAI key
            // No baseURL, defaults to https://api.openai.com/v1
        });

        // We'll run these in parallel for speed
        let summaries;
        try {
            console.log("Starting AI Generation...");

            const [structuredRes, spiritualRes, quoteRes, imagePromptRes] = await Promise.all([
                // 1. Structured Summary (Perplexity) - Using Transcript
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a precise data extractor. Output ONLY a bulleted list of 3 points. Do not use phrases like "Based on the transcript" or "Here is the summary". Do not include citations like [1].\n\nExample Output:\n- Point 1\n- Point 2\n- Point 3' },
                        { role: 'user', content: `Analyze the following transcript and provide a factual, structured summary with exactly 3 main bullet points. Transcript: ${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Structured Summary Done"); return res.choices[0]?.message?.content || ""; }),

                // 2. Spiritual Essence (Perplexity) - Using Transcript
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a spiritual poet. Output ONLY the poetic essence text. Do not use phrases like "Here is the essence" or "Based on the text". Do not include citations like [1]. Just the pure spiritual message.' },
                        { role: 'user', content: `Rewrite the core message of this transcript into a poetic, resonant spiritual essence. Focus on the energy and the soul of the message. Transcript: ${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Spiritual Essence Done"); return res.choices[0]?.message?.content || ""; }),

                // 3. Quote (Perplexity) - Using Transcript
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a quote extractor. Output ONLY the quote text itself. Do not include "The quote is:" or citations like [1]. Do not add your own commentary.' },
                        { role: 'user', content: `Extract the single most powerful, short, and inspirational quote from this transcript. Return ONLY the quote text, nothing else. Transcript: ${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Quote Done"); return res.choices[0]?.message?.content || ""; }),

                // 4. Visual Prompt (Perplexity) - Using Transcript
                textClient.chat.completions.create({
                    model: 'perplexity/sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a visual artist. Output ONLY the image description. Do not use phrases like "Here is a description" or citations like [1]. Just the visual details.' },
                        { role: 'user', content: `Based on the spiritual essence of this transcript, describe a single, abstract, cinematic, and ethereal image that represents the soul of this message. The image should be suitable for a vertical 9:16 video background. Describe lighting, colors, and mood. Keep it under 50 words. Transcript: ${transcript.slice(0, 20000)}` }
                    ],
                }, { headers: { 'X-Vercel-AI-Provider': 'perplexity' } }).then(res => { console.log("Visual Prompt Done"); return res.choices[0]?.message?.content || ""; }),
            ]);

            console.log("Text Generation Complete. Starting Image Generation...");

            // 5. Generate Image (DALL-E 3) - Direct OpenAI Call
            let imageUrl = null;
            try {
                const imageResponse = await imageClient.images.generate({
                    model: "dall-e-3",
                    prompt: `Vertical 9:16 aspect ratio. Spiritual, ethereal, cinematic, 8k resolution. ${imagePromptRes}`,
                    n: 1,
                    size: "1024x1792",
                });
                imageUrl = imageResponse?.data?.[0]?.url || null;
                console.log("Image Generation Done");
            } catch (imgError) {
                console.error("Image generation failed:", imgError);
                imageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"; // Fallback
            }

            summaries = {
                structured: structuredRes,
                spiritual: spiritualRes,
                quote: quoteRes,
                image_url: imageUrl,
                image_prompt: imagePromptRes
            };
        } catch (aiError) {
            console.error("AI Generation failed, falling back to mock:", aiError);
            summaries = {
                structured: "AI Generation Failed (Check Server Logs). Mock: The video covers three main points: 1. The importance of mindfulness. 2. How to practice daily gratitude. 3. The connection between inner peace and outer reality.",
                spiritual: "AI Generation Failed. Mock: At its core, this message invites you to return to the sanctuary of your own heart.",
                quote: "The universe is not outside of you.",
                image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop",
                image_prompt: "A mock spiritual background."
            };
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
