"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Youtube, Loader2, Sparkles, FileText, Quote, Play } from "lucide-react";
import clsx from "clsx";

type SummaryType = "structured" | "spiritual" | "quote";

interface VideoData {
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
    };
}

export default function Generator() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<VideoData | null>(null);
    const [activeTab, setActiveTab] = useState<SummaryType>("spiritual");

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
                        </div>

                        {/* Right Column: Preview */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Play className="w-5 h-5 text-primary" /> Generated Short
                            </h3>
                            <div className="aspect-[9/16] bg-black rounded-2xl border border-border overflow-hidden relative group">
                                {/* Mock Video Player */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-full bg-secondary/20 flex flex-col items-center justify-center text-muted-foreground">
                                        <Sparkles className="w-12 h-12 mb-4 text-primary/50" />
                                        <p>Video Preview Generating...</p>
                                        <p className="text-xs opacity-50 mt-2">(FFmpeg processing placeholder)</p>
                                    </div>
                                </div>

                                {/* Overlay Mock */}
                                <div className="absolute bottom-10 left-6 right-6 text-center">
                                    <p className="text-white text-xl font-bold drop-shadow-lg font-serif italic">
                                        "{data.summaries.quote}"
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button className="flex-1 h-12 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors">
                                    Download
                                </button>
                                <button className="flex-1 h-12 rounded-xl bg-primary text-background font-medium hover:bg-primary/90 transition-colors">
                                    Publish to YouTube
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
