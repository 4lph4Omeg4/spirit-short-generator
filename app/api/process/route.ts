import { NextResponse } from 'next/server';
import { getVideoMetadata, getTranscript } from '@/lib/youtube';
import { supabase } from '@/lib/supabase';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
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

        // 3. Generate Summaries & Visuals with Vercel AI SDK
        const perplexity = createOpenAI({
            apiKey: process.env.PERPLEXITY_API_KEY || '',
            baseURL: 'https://api.perplexity.ai',
        });

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
        });

        // Initialize OpenAI for Image Generation
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // We'll run these in parallel for speed
        let summaries;
        try {
            const [structuredRes, spiritualRes, quoteRes, imagePromptRes] = await Promise.all([
                // 1. Structured Summary (Perplexity)
                generateText({
                    model: perplexity('sonar-pro'),
                    prompt: `Analyze the following transcript and provide a factual, structured summary with 3 main bullet points. Transcript: ${transcript.slice(0, 20000)}`,
                }),

                // 2. Spiritual Essence (Gemini)
                generateText({
                    model: google('gemini-1.5-pro'),
                    prompt: `You are a spiritual alchemist. Rewrite the core message of this transcript into a poetic, resonant spiritual essence. Focus on the energy and the soul of the message. Transcript: ${transcript.slice(0, 20000)}`,
                }),

                // 3. Quote (Gemini Flash)
                generateText({
                    model: google('gemini-1.5-flash'),
                    prompt: `Extract the single most powerful, short, and inspirational quote from this transcript. Return ONLY the quote text, nothing else. Transcript: ${transcript.slice(0, 20000)}`,
                }),

                // 4. Visual Prompt (Gemini Flash)
                generateText({
                    model: google('gemini-1.5-flash'),
                    prompt: `Based on the spiritual essence of this transcript, describe a single, abstract, cinematic, and ethereal image that represents the soul of this message. The image should be suitable for a vertical 9:16 video background. Describe lighting, colors, and mood. Keep it under 50 words. Transcript: ${transcript.slice(0, 20000)}`,
                }),
            ]);

            // 5. Generate Image (DALL-E 3)
            let imageUrl = null;
            try {
                const imageResponse = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: `Vertical 9:16 aspect ratio. Spiritual, ethereal, cinematic, 8k resolution. ${imagePromptRes.text}`,
                    n: 1,
                    size: "1024x1792",
                });
                imageUrl = imageResponse?.data?.[0]?.url || null;
            } catch (imgError) {
                console.error("Image generation failed:", imgError);
                imageUrl = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"; // Fallback
            }

            summaries = {
                structured: structuredRes.text,
                spiritual: spiritualRes.text,
                quote: quoteRes.text,
                image_url: imageUrl,
                image_prompt: imagePromptRes.text
            };
        } catch (aiError) {
            console.error("AI Generation failed (likely missing keys), falling back to mock:", aiError);
            summaries = {
                structured: "AI Generation Failed (Check API Keys). Mock: The video covers three main points: 1. The importance of mindfulness. 2. How to practice daily gratitude. 3. The connection between inner peace and outer reality.",
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
