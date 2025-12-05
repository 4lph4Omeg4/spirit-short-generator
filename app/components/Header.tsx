import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Header() {
    return (
        <header className="w-full py-6 px-8 flex items-center justify-between border-b border-border/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2 group">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                    Timeline Alchemy
                </span>
            </Link>
            <nav className="flex items-center gap-6">
                <Link
                    href="#"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                    History
                </Link>
                <Link
                    href="#"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                    Settings
                </Link>
            </nav>
        </header>
    );
}
