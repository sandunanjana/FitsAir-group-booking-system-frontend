import logoUrl from "/fitsairlogo.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { useAuthStore } from "@/auth/store";

export default function Login(): JSX.Element {
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [err, setErr] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();
    const { login: doLogin } = useAuthStore();

    async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        setErr("");

        if (!username.trim() || !password.trim()) {
            setErr("Please enter both username and password");
            return;
        }

        setLoading(true);
        try {
            const res = await login({ username, password });
            doLogin(res.token, res.role, username);
            nav("/");
        } catch (error: any) {
            setErr(error.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden p-6"
            style={{ background: "linear-gradient(135deg, #001B71 0%, #EA0029 100%)" }}
        >
            

            <div className="w-full max-w-md relative z-10">
                {/* card with glassmorphism effect */}
                <div className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-8 hover:shadow-3xl transition-all duration-500">
                    {/* header */}
                    <div className="text-center mb-6">
                        <div className="mb-5 transform hover:scale-105 transition-transform duration-300">
                            <img
                                src={logoUrl}
                                alt="FitsAir"
                                className="mx-auto h-12 w-auto rounded-lg shadow-lg"
                            />
                        </div>

                        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
                        <p className="mt-2 text-sm text-white/80">Sign in to your account</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-2">
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-red-500/10 rounded-xl transform group-focus-within:scale-105 transition-transform duration-300"></div>
                                <div className="relative">
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 text-white placeholder-white/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition-all duration-300"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setU(e.target.value)}
                                        disabled={loading}
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <svg className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-red-500/10 rounded-xl transform group-focus-within:scale-105 transition-transform duration-300"></div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 text-white placeholder-white/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition-all duration-300"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setP(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white transition-colors duration-200"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M13.875 18.825A10.05 10.05 0 0112 19C7.523 19 3.733 16.057 2.458 12a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l3.59 3.59A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {err && (
                            <div
                                className="mt-2 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 px-4 py-3 flex items-start gap-2 animate-fade-in"
                                role="alert"
                                aria-live="polite"
                            >
                                <svg className="h-5 w-5 mt-0.5 text-red-200 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd" />
                                </svg>
                                <p className="text-sm">{err}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-white font-semibold
                         shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-white/40 hover:shadow-xl hover:-translate-y-0.5"
                            style={{ background: "linear-gradient(135deg, #EA0029 0%, #001B71 100%)" }}
                        >
                            <span className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                            {loading ? (
                                <div className="flex items-center relative z-10">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </div>
                            ) : (
                                <div className="flex items-center relative z-10">
                                    <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Sign in
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                {/* footer help */}
                <div className="text-center mt-6">
                    <p className="text-sm text-white/85">
                        Need help?{" "}
                        <a href="#" className="font-semibold text-white underline underline-offset-4 hover:opacity-90 transition-opacity duration-200">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                .animate-pulse-slow {
                    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-pulse-slower {
                    animation: pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}