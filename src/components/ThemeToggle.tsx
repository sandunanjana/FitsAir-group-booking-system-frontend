import { useEffect, useState } from "react";

export default function ThemeToggle(): JSX.Element {
    const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

    useEffect(() => {
        const root = document.documentElement;
        if (dark) { root.classList.add("theme-dark"); localStorage.setItem("theme", "dark"); }
        else { root.classList.remove("theme-dark"); localStorage.setItem("theme", "light"); }
    }, [dark]);

    return (
        <button className="btn-ghost" onClick={() => setDark(v => !v)}>
            {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
    );
}
