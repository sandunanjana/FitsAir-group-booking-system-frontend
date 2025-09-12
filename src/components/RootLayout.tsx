// src/components/RootLayout.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/auth/store";
import { useState, useEffect } from "react";

const baseNav = [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/group-requests", label: "Group Requests", icon: "👥" },
    { to: "/quotations", label: "Quotations", icon: "📝" },
    { to: "/payments", label: "Payments", icon: "💳" },

];

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const { pathname } = useLocation();
    const { logout, username, role } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // build visible items in order
    const items: { to: string; label: string; icon: string }[] = [...baseNav];

    // ⬇️ push AFTER payments (so it shows below it)
    if (role === "GROUP_DESK" || role === "ADMIN") {
        items.push({ to: "/pnr", label: "Issue PNR", icon: "🎫" });
    }

    // admin-only link at the very end
    if (role === "ADMIN") {
        items.push({ to: "/admin/users", label: "Users", icon: "👤" });
    }

    const getRoleDisplay = (r: string) => ({
        GROUP_DESK: "Group Desk",
        ROUTE_CONTROLLER: "Route Controller",
        ADMIN: "Administrator",
    }[r] || r);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => { if (isMobile) setSidebarOpen(false); }, [pathname, isMobile]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="min-h-screen flex">
            {sidebarOpen && isMobile && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {sidebarOpen && (
                <aside className={`fixed md:relative w-64 bg-gray-900 text-white p-6 flex flex-col z-50 h-screen`}>
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">FA</span>
                                </div>
                                <h1 className="font-bold text-xl">FitsAir Admin</h1>
                            </div>
                            <button onClick={toggleSidebar} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700" title="Hide sidebar">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="text-sm text-gray-300 mb-1">{username ?? "User"}</div>
                        <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-md inline-block">
                            {role ? getRoleDisplay(role) : "No role assigned"}
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="space-y-2 flex-1">
                        {items.map((n) => {
                            const isActive = pathname === n.to;
                            return (
                                <Link
                                    key={n.to}
                                    to={n.to}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors ${isActive ? "bg-blue-600 text-white shadow-lg" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                                        }`}
                                >
                                    <span className="text-lg">{n.icon}</span>
                                    <span className="font-medium">{n.label}</span>
                                    {isActive && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-6 border-t border-gray-700">
                        <button
                            onClick={logout}
                            className="flex items-center gap-3 w-full text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <span className="text-lg">🚪</span>
                            <span className="font-medium">Log out</span>
                        </button>
                    </div>
                </aside>
            )}

            {/* Main */}
            <main className={`flex-1 bg-gray-50 min-h-screen overflow-auto`}>
                <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                    {!sidebarOpen && (
                        <button onClick={toggleSidebar} className="text-gray-600 p-2 rounded-lg hover:bg-gray-100" title="Show sidebar">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                        <span className="text-sm text-gray-600 hidden md:block">
                            {username} • {role ? getRoleDisplay(role) : "No role"}
                        </span>
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                    </div>
                </div>

                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
