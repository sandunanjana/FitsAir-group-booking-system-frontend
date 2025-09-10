import { useEffect, useRef, useState } from "react";
import { AIRPORTS } from "@/data/airports";

export default function AirportSelect({
    value,
    onChange,
    placeholder = "City or airport",
}: {
    value: string;
    onChange: (code: string) => void;
    placeholder?: string;
}): JSX.Element {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                className="input flex items-center justify-between font-medium tracking-widest"
                onClick={() => setOpen((o) => !o)}
            >
                <span className={value ? "opacity-100" : "opacity-50"}>{value || placeholder}</span>
                <svg className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-2xl shadow-soft max-h-72 overflow-auto">
                    {AIRPORTS.map((a) => (
                        <button
                            key={a.code}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center gap-3"
                            onClick={() => { onChange(a.code); setOpen(false); }}
                        >
                            <div className="w-12 font-semibold tracking-widest">{a.code}</div>
                            <div className="flex-1">
                                <div className="font-medium">{a.city}</div>
                                <div className="text-xs text-muted-foreground">{a.country}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
