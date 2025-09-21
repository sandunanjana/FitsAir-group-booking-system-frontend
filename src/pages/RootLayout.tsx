// src/components/RootLayout.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/auth/store";
import { useState, useEffect, useMemo } from "react";
import logoUrl from "/fitsairlogo.png";

const baseNav = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/group-requests", label: "Group Requests", icon: "👥" },
  { to: "/quotations", label: "Quotations", icon: "📝" },
  { to: "/payments", label: "Payments", icon: "💳" },
];

const BRAND_GRADIENT = "linear-gradient(135deg, #001B71 0%, #EA0029 100%)";

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { pathname } = useLocation();
  const { logout, username, role } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const items = useMemo(() => {
    const arr = [...baseNav];
    if (role === "GROUP_DESK" || role === "ADMIN") arr.push({ to: "/pnr", label: "Issue PNR", icon: "🎫" });
    if (role === "ADMIN") arr.push({ to: "/admin/users", label: "Users", icon: "👤" });
    return arr;
  }, [role]);

  const getRoleDisplay = (r: string) =>
    ({ GROUP_DESK: "Group Desk", ROUTE_CONTROLLER: "Route Controller", ADMIN: "Administrator" } as Record<string, string>)[r] || r;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen flex">
      {/* mobile overlay */}
      {sidebarOpen && isMobile && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      {sidebarOpen && (
        <aside
          className="fixed md:relative w-72 px-6 pt-3 pb-6 flex flex-col z-50 h-screen text-white shadow-2xl relative"
          style={{ background: BRAND_GRADIENT }}
        >
          {/* Close button top-right */}
          <button
            onClick={toggleSidebar}
            className="absolute top-3 right-3 text-white/90 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo close to top */}
          <div className="flex flex-col items-center mt-2 mb-2">
            <Link to="/" className="inline-flex items-center justify-center" aria-label="Go to dashboard">
              <img src={logoUrl} alt="FitsAir" className="h-12 w-auto rounded-md" />
            </Link>
          </div>

          {/* Name + Role card */}
          <div className="w-full bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 mb-5">
            <div className="flex flex-col items-center text-center">
              <p className="font-semibold text-white mt-0.5 truncate">
                {(username ?? "grop desk").toLowerCase()}
              </p>
              <p className="text-xs text-white/80 mt-1">
                {role ? getRoleDisplay(role) : "Group Desk"}
              </p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-2 flex-1">
            {items.map((n) => {
              const isActive = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={[
                    "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all",
                    "ring-1 ring-inset",
                    isActive
                      ? "bg-white/20 ring-white/30 shadow-lg"
                      : "bg-white/5 ring-white/10 hover:bg-white/10 hover:ring-white/20",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-lg">{n.icon}</span>
                  <span className="font-medium tracking-wide">{n.label}</span>
                  {isActive && (
                    <span className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#001B71] text-xs font-extrabold">
                      ●
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-6 mt-2 border-t border-white/15">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full text-white/90 hover:text-white px-4 py-3 rounded-xl hover:bg-white/10 ring-1 ring-inset ring-white/10 hover:ring-white/20 transition-colors"
            >
              <span className="text-lg">🚪</span>
              <span className="font-semibold">Log out</span>
            </button>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main className="flex-1 min-h-screen overflow-auto bg-gray-50">
        <div
          className="p-4 flex items-center justify-between shadow-sm sticky top-0 z-30"
          style={{ background: BRAND_GRADIENT }}
        >
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="text-white/90 p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Show sidebar"
              aria-label="Show sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <span className="hidden md:block text-sm text-white/90 ml-auto">
            {username} • {role ? getRoleDisplay(role) : "No role"}
          </span>
        </div>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
