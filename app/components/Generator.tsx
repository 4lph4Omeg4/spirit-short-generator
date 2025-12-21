"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Youtube, Loader2, Sparkles, FileText,
    Quote, Image as ImageIcon, History, Trash2,
    Settings2, Sliders, ChevronLeft,
    ChevronRight, Download, RefreshCw, Layers
} from "lucide-react";
import clsx from "clsx";

/**
 * Types & Interfaces
 */
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

/**
 * Main Generator Component
 * A multidimensional interface inspired by Zen-minimalism, Arc, and Vision Pro.
 */
export default function Generator() {
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<SummaryType>("spiritual");
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Data State
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<VideoData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Configuration State
    const [config, setConfig] = useState({
        vibe: "ethereal",
        length: "balanced",
        depth: 70,
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    /**
     * Data Logic
     */
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
            transcript: "",
            summaries: {
                structured: item.summary_structured,
                spiritual: item.spiritual_essence,
                quote: item.quote,
                image_url: item.image_url,
                image_prompt: item.image_prompt,
            }
        });
    };

    function getYouTubeID(url_str: string) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url_str.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!url) return;

        setLoading(true);
        setData(null);

        try {
            const res = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, config })
            });

            if (!res.ok) throw new Error('Failed to process');

            const result = await res.json();
            setData(result);
            fetchHistory();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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

        canvas.width = 1080;
        canvas.height = 1920;

        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const targetAspect = 9 / 16;
        const sourceAspect = sourceWidth / sourceHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (sourceAspect > targetAspect) {
            drawHeight = sourceHeight;
            drawWidth = sourceHeight * targetAspect;
            offsetX = (sourceWidth - drawWidth) / 2;
            offsetY = 0;
        } else {
            drawWidth = sourceWidth;
            drawHeight = sourceWidth / targetAspect;
            offsetX = 0;
            offsetY = (sourceHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, 1080, 1920);

        const gradient = ctx.createLinearGradient(0, 1920, 0, 1000);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 1000, 1080, 920);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = 'italic bold 56px Georgia, serif';

        const quote_text = data.summaries.quote;
        const maxWidth = 900;
        const words = quote_text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const lineHeight = 75;
        const startY = 1650 - (lines.length - 1) * lineHeight;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        lines.forEach((l, i) => {
            ctx.fillText(l.trim(), 540, startY + i * lineHeight);
        });

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '300 24px Inter, sans-serif';
        ctx.letterSpacing = '12px';
        ctx.fillText('TIMELINE ALCHEMY', 540, 1800);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(340, 1720);
        ctx.lineTo(740, 1720);
        ctx.stroke();

        const download_link = document.createElement('a');
        download_link.download = `spirit-short-${Date.now()}.png`;
        download_link.href = canvas.toDataURL('image/png', 1.0);
        download_link.click();
    };

    /**
     * Render
     */
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Sidebar (History) */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="glass-panel border-r border-border shrink-0 z-20 overflow-hidden hidden md:flex flex-col"
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-sm uppercase tracking-widest text-primary">History</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide space-y-4">
                    {historyLoading && history.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : history.length > 0 ? (
                        history.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                onClick={() => selectFromHistory(item)}
                                className="group relative glass-panel rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all p-2"
                            >
                                <div className="aspect-video rounded-lg overflow-hidden relative mb-3">
                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="px-2">
                                    <h4 className="text-xs font-medium line-clamp-1 mb-1">{item.title}</h4>
                                    <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={(e) => deleteVideo(item.id, e)}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white/50 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </motion.div>
                        ))
                    ) : (
                        <p className="text-center text-xs text-muted-foreground py-12">No generations yet.</p>
                    )}
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Header / URL Input */}
                <header className="h-20 border-b border-border flex items-center px-6 gap-4 z-10 bg-background/50 backdrop-blur-md">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                        aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>

                    <form onSubmit={handleSubmit} className="flex-1 max-w-2xl mx-auto flex items-center gap-3 glass-panel rounded-full px-4 py-1.5 border-border/50 shadow-sm">
                        <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter YouTube URL for transformation..."
                            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60 focus:ring-0"
                        />
                        <button
                            type="submit"
                            disabled={loading || !url}
                            className="h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3" /> Generate</>}
                        </button>
                    </form>

                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className={clsx(
                            "p-2 rounded-lg transition-all",
                            isConfigOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                        )}
                        aria-label="Configuration"
                    >
                        <Settings2 size={20} />
                    </button>
                </header>

                {/* Stage Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">
                    {!data && !loading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-8"
                        >
                            <div className="relative">
                                <div className="w-24 h-24 rounded-3xl ritual-gradient flex items-center justify-center shadow-2xl shadow-primary/40 rotate-12" />
                                <div className="absolute inset-0 w-24 h-24 rounded-3xl glass-panel flex items-center justify-center -rotate-6 -translate-x-2 -translate-y-2 translate-z-10">
                                    <Layers className="w-10 h-10 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">
                                    Ritual of Essence
                                </h1>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    Paste a link above to begin the extraction of spiritual wisdom.
                                    Our alchemist will distill facts into poetry.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center space-y-12">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-2 border-primary/5 border-t-primary animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-light tracking-[0.2em] text-primary uppercase">Distilling Essence</p>
                                <p className="text-sm text-muted-foreground font-serif italic">Connecting to the multidimensional field...</p>
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {data && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="grid grid-cols-1 xl:grid-cols-12 gap-12 max-w-7xl mx-auto items-start"
                            >
                                {/* Results: Left Side */}
                                <div className="xl:col-span-7 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden glass-panel shrink-0 shadow-lg">
                                            <img src={data.metadata.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-xl line-clamp-1">{data.metadata.title}</h2>
                                            <p className="text-sm text-muted-foreground font-serif">{data.metadata.author_name}</p>
                                        </div>
                                    </div>

                                    <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-xl border-border/40">
                                        <div className="flex p-3 bg-muted/20 backdrop-blur-sm border-b border-border/40">
                                            {[
                                                { id: "spiritual", label: "Essence", icon: Sparkles },
                                                { id: "quote", label: "Oracle", icon: Quote },
                                                { id: "structured", label: "Context", icon: FileText },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id as SummaryType)}
                                                    className={clsx(
                                                        "flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] uppercase tracking-widest font-bold rounded-2xl transition-all",
                                                        activeTab === tab.id
                                                            ? "bg-background text-primary shadow-md shadow-black/5"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                                    )}
                                                >
                                                    <tab.icon className="w-4 h-4" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="p-10 md:p-14">
                                            <motion.p
                                                key={activeTab}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-xl md:text-2xl leading-[1.6] font-serif italic text-foreground/90 whitespace-pre-wrap selection:bg-primary/20"
                                            >
                                                {activeTab === 'quote' ? `"${data.summaries[activeTab]}"` : data.summaries[activeTab]}
                                            </motion.p>
                                        </div>
                                    </div>

                                    <div className="glass-panel p-8 rounded-3xl border-primary/20 bg-primary/[0.02]">
                                        <div className="flex items-center gap-3 mb-4 text-primary">
                                            <ImageIcon size={20} className="animate-pulse" />
                                            <span className="text-[11px] font-bold uppercase tracking-[0.3em]">Visual Incantation</span>
                                        </div>
                                        <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed">
                                            {data.summaries.image_prompt}
                                        </p>
                                    </div>
                                </div>

                                {/* Preview: Right Side */}
                                <div className="xl:col-span-5 space-y-8 sticky top-12">
                                    <div className="aspect-[9/16] ritual-gradient rounded-[3rem] p-1.5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative group">
                                        <div className="absolute inset-0 rounded-[2.8rem] overflow-hidden bg-black">
                                            <motion.img
                                                initial={{ scale: 1.1 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                                                src={data.summaries.image_url}
                                                alt="Generated"
                                                className="w-full h-full object-cover opacity-90"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-12 flex flex-col justify-end text-center">
                                                <p className="text-white text-3xl font-bold font-serif italic leading-snug drop-shadow-2xl mb-8">
                                                    {data.summaries.quote}
                                                </p>
                                                <div className="pt-8 border-t border-white/20">
                                                    <p className="text-white/40 text-[10px] uppercase tracking-[0.5em] font-light">Timeline Alchemy</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleDownload}
                                            className="flex-1 h-14 rounded-2xl glass-panel hover:bg-muted font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                                        >
                                            <Download className="w-5 h-5" /> Download
                                        </button>
                                        <button
                                            onClick={() => handleSubmit()}
                                            className="flex-1 h-14 rounded-2xl ritual-gradient text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:opacity-95 transition-all active:scale-95"
                                        >
                                            <RefreshCw className="w-5 h-5" /> Regenerate
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Config Panel (Side Drawer) */}
            <AnimatePresence>
                {isConfigOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConfigOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md z-30"
                        />
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-[380px] glass-panel border-l border-border/50 z-40 p-10 flex flex-col gap-10 shadow-[0_0_80px_rgba(0,0,0,0.3)] bg-background/80"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <Sliders className="w-5 h-5 text-primary" /> Parameters
                                </h3>
                                <button
                                    onClick={() => setIsConfigOpen(false)}
                                    className="p-2 hover:bg-muted rounded-xl shrink-0 transition-colors"
                                    title="Close configuration"
                                    aria-label="Close configuration"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">Vibrational Vibe</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {['ethereal', 'grounded', 'cosmic', 'zen'].map((v) => (
                                            <button
                                                key={v}
                                                onClick={() => setConfig({ ...config, vibe: v })}
                                                className={clsx(
                                                    "w-full h-12 flex items-center px-4 rounded-xl text-sm font-medium capitalize transition-all border",
                                                    config.vibe === v
                                                        ? "bg-primary/10 border-primary/50 text-primary shadow-inner shadow-primary/5"
                                                        : "bg-muted/30 border-transparent hover:bg-muted"
                                                )}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="spiritual-depth" className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">Spiritual Depth</label>
                                        <span className="text-xs font-mono font-bold text-primary">{config.depth}%</span>
                                    </div>
                                    <input
                                        id="spiritual-depth"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={config.depth}
                                        onChange={(e) => setConfig({ ...config, depth: parseInt(e.target.value) })}
                                        className="w-full accent-primary bg-muted h-1 rounded-full appearance-none cursor-pointer"
                                        title="Adjust Spiritual Depth"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">Dilation</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['balanced', 'insightful'].map((len) => (
                                            <button
                                                key={len}
                                                onClick={() => setConfig({ ...config, length: len })}
                                                className={clsx(
                                                    "h-14 rounded-2xl text-[11px] uppercase tracking-widest font-bold border transition-all",
                                                    config.length === len
                                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                                        : "border-border/50 hover:border-muted-foreground/30 text-muted-foreground"
                                                )}
                                            >
                                                {len}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-primary font-black uppercase tracking-tighter mb-1">Ether Status</p>
                                    <p className="text-xs font-bold">Resonance Synced</p>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)] animate-pulse" />
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
