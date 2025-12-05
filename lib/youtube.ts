import { YoutubeTranscript } from 'youtube-transcript';

export interface VideoMetadata {
    title: string;
    thumbnail_url: string;
    author_name: string;
    description: string;
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) throw new Error('Failed to fetch video metadata');
    const data = await res.json();

    return {
        title: data.title,
        thumbnail_url: data.thumbnail_url,
        author_name: data.author_name,
        description: "", // oEmbed doesn't provide description
    };
}

export async function getTranscript(url: string): Promise<string | null> {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        return transcript.map(t => t.text).join(' ');
    } catch (e) {
        console.error("Failed to fetch transcript", e);
        return null;
    }
}
