"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Youtube, Loader2, Sparkles, FileText, Quote, Image as ImageIcon, History, Trash2, ExternalLink } from "lucide-react";
import clsx from "clsx";

type SummaryType = "structured" | "spiritual" | "quote";

interface VideoData {
    id?: string;
    metadata: {
        title: string;
        thumbnail_url: string;
        author_name: string;
    };
    transcript: string;
    summaries: {
        structured: string;
        spiritual: string;
        quote: string;
        image_url: string;
        image_prompt: string;
    };
}

interface HistoryItem {
    id: string;
    video_url: string;
    title: string;
    channel_name: string;
    summary_structured: string;
    spiritual_essence: string;
    quote: string;
    image_prompt: string;
    image_url: string;
    created_at: string;
}

export default function Generator() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<VideoData | null>(null);
    const [activeTab, setActiveTab] = useState<SummaryType>("spiritual");
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/api/videos');
            if (res.ok) {
                const items = await res.json();
                setHistory(items);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const deleteVideo = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this generation?")) return;

        try {
            const res = await fetch('/api/videos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                setHistory(history.filter(item => item.id !== id));
                if (data?.id === id) setData(null);
            }
        } catch (error) {
            console.error("Failed to delete video:", error);
        }
    };

    const selectFromHistory = (item: HistoryItem) => {
        setData({
            id: item.id,
            metadata: {
                title: item.title,
                thumbnail_url: `https://img.youtube.com/vi/${getYouTubeID(item.video_url)}/mqdefault.jpg`,
                author_name: item.channel_name,
            },
            transcript: "", // History doesn't load full transcript to save bandwidth
            summaries: {
                structured: item.summary_structured,
                spiritual: item.spiritual_essence,
                quote: item.quote,
                image_url: item.image_url,
                image_prompt: item.image_prompt,
            }
        });
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    function getYouTubeID(url: string) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const handleDownload = async () => {
        if (!data?.summaries?.image_url) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = data.summaries.image_url;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        // Set high-res 9:16 dimensions (e.g., 1080x1920)
        canvas.width = 1080;
        canvas.height = 1920;

        // 1. Calculate Crop (Center-crop 9:16 from source)
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const targetAspect = 9 / 16;
        const sourceAspect = sourceWidth / sourceHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (sourceAspect > targetAspect) {
            // Source is wider than 9:16 (e.g. square 1:1)
            drawHeight = sourceHeight;
            drawWidth = sourceHeight * targetAspect;
            offsetX = (sourceWidth - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Source is taller than 9:16
            drawWidth = sourceWidth;
            drawHeight = sourceWidth / targetAspect;
            offsetX = 0;
            offsetY = (sourceHeight - drawHeight) / 2;
        }

        // 2. Draw Image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, 1080, 1920);

        // 3. Draw Gradient Overlay (Bottom-up)
        const gradient = ctx.createLinearGradient(0, 1920, 0, 1000);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 1000, 1080, 920);

        // 4. Draw Quote
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Custom Serif Font approximation
        ctx.font = 'italic bold 56px Georgia, serif';

        const quote = data.summaries.quote;
        const maxWidth = 900;
        const words = quote.split(' ');
        let line = '';
        let lines = [];

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Draw lines from bottom up
        const lineHeight = 75;
        let startY = 1650 - (lines.length - 1) * lineHeight;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        lines.forEach((l, i) => {
            ctx.fillText(l.trim(), 540, startY + i * lineHeight);
        });

        // 5. Draw Branding
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '300 24px Inter, sans-serif';
        ctx.letterSpacing = '12px';
        ctx.fillText('TIMELINE ALCHEMY', 540, 1800);

        // 6. Signature line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(340, 1720);
        ctx.lineTo(740, 1720);
        ctx.stroke();

        // 7. Trigger Download
        const link = document.createElement('a');
        link.download = `spirit-short-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setData(null);

        try {
            const res = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!res.ok) throw new Error('Failed to process');

            const result = await res.json();
            setData(result);
            fetchHistory(); // Refresh history after new generation
        } catch (error) {
            console.error(error);
            // Handle error state
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-12 px-4 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-200 to-primary">
                    Spirit Shorts Generator
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Transform long-form spiritual content into resonant short videos.
                    Blend factual clarity with poetic essence.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative z-10 mb-12"
            >
                <div className="bg-card border border-border rounded-2xl p-2 shadow-2xl shadow-primary/5">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <div className="pl-4 text-red-500">
                            <Youtube className="w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste YouTube URL here..."
                            className="flex-1 bg-transparent border-none outline-none h-14 text-lg placeholder:text-muted-foreground/50 text-foreground"
                        />
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="h-12 px-8 rounded-xl bg-primary text-background font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Generate <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>

            <AnimatePresence>
                {data && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        {/* Left Column: Summaries */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src={data.metadata.thumbnail_url}
                                    alt={data.metadata.title}
                                    className="w-16 h-16 rounded-lg object-cover border border-border"
                                />
                                <div>
                                    <h3 className="font-semibold line-clamp-1 text-foreground">{data.metadata.title}</h3>
                                    <p className="text-sm text-muted-foreground">{data.metadata.author_name}</p>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                <div className="flex border-b border-border">
                                    {[
                                        { id: "structured", label: "Structured", icon: FileText },
                                        { id: "spiritual", label: "Spiritual", icon: Sparkles },
                                        { id: "quote", label: "Quote", icon: Quote },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as SummaryType)}
                                            className={clsx(
                                                "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors",
                                                activeTab === tab.id
                                                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                            )}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-6 min-h-[200px]">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                            {data.summaries[activeTab]}
                                        </p>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Image Prompt Section */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-4 h-4" /> Visual Prompt
                                </h4>
                                <p className="text-sm text-muted-foreground italic">
                                    {data.summaries.image_prompt}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Generated Visual */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" /> Generated Visual Essence
                            </h3>
                            <div className="aspect-[9/16] bg-black rounded-2xl border border-border overflow-hidden relative group shadow-2xl">
                                {/* Generated Image */}
                                <img
                                    src={data.summaries.image_url}
                                    alt="Generated Spiritual Essence"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />

                                {/* Overlay Text */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-center">
                                    <p className="text-white text-xl font-bold drop-shadow-lg font-serif italic leading-relaxed">
                                        {data.summaries.quote}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-white/20">
                                        <p className="text-white/60 text-xs uppercase tracking-widest">Timeline Alchemy</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 h-12 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                                >
                                    Download Image
                                </button>
                                <button className="flex-1 h-12 rounded-xl bg-primary text-background font-medium hover:bg-primary/90 transition-colors">
                                    Generate Audio (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* History Section */}
            <div className="mt-24">
                <div className="flex items-center gap-2 mb-8">
                    <History className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Recent Generations</h2>
                </div>

                {historyLoading && history.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : history.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                                onClick={() => selectFromHistory(item)}
                            >
                                <div className="aspect-video relative overflow-hidden">
                                    <img
                                        src={item.image_url}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <button
                                        onClick={(e) => deleteVideo(item.id, e)}
                                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h4 className="font-semibold text-foreground line-clamp-1 mb-1">{item.title}</h4>
                                    <p className="text-xs text-muted-foreground mb-3">{item.channel_name}</p>
                                    <p className="text-sm text-foreground/70 line-clamp-2 italic mb-4">
                                        &quot;{item.quote}&quot;
                                    </p>
                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2">
                                            <a
                                                href={item.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">No history yet</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                            Generations will appear here once you start transforming videos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
