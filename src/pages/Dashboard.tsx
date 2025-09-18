// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchDashboard as rawFetchDashboard,
    type DashboardStatsDTO,
} from "@/api/endpoints";

/** Support both endpoint signatures:
 *   - old: fetchDashboard()
 *   - new: fetchDashboard(lastLoginDate?: string)
 */
const fetchDashboard = rawFetchDashboard as unknown as (
    lastLoginDate?: string
) => Promise<{ data: DashboardStatsDTO }>;

export default function Dashboard(): JSX.Element {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardStatsDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    /** Ensure we always have a persisted lastLoginDate (yyyy-MM-dd) */
    const lastLoginDate = useMemo(() => {
        const existing = localStorage.getItem("lastLoginDate");
        if (existing && /^\d{4}-\d{2}-\d{2}$/.test(existing)) return existing;
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem("lastLoginDate", today);
        return today;
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const r = await fetchDashboard(lastLoginDate);
            setData(r.data);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError("Failed to load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshData = async () => {
        setLoading(true);
        try {
            const r = await fetchDashboard(lastLoginDate);
            setData(r.data);
            setError(null);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Dashboard refresh error:", err);
            setError("Failed to refresh dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
                            <div className="h-8 bg-gray-300 rounded w-1/2 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <button
                        onClick={refreshData}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        <RefreshIcon />
                        Retry
                    </button>
                </div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ErrorIcon />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Overview</h2>
                    <p className="text-xs text-gray-500">
                        Since last login: <span className="font-medium">{lastLoginDate}</span>
                        {lastUpdated && (
                            <>
                                {" · Last updated "}
                                <time dateTime={lastUpdated.toISOString()}>
                                    {lastUpdated.toLocaleTimeString()}
                                </time>
                            </>
                        )}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const today = new Date().toISOString().slice(0, 10);
                            localStorage.setItem("lastLoginDate", today);
                            void refreshData();
                        }}
                        className="px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
                        title="Reset 'since last login' to today"
                    >
                        Set login = today
                    </button>

                    <button
                        onClick={refreshData}
                        className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Refresh data"
                    >
                        <RefreshIcon />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Kpi
                    label="New Requests Since Login"
                    value={data?.newRequestsSinceLogin ?? 0}
                    icon={<PlusCircleIcon className="text-blue-500" />}
                    trend="up"
                />
                <Kpi
                    label="Quotes Expiring Today"
                    value={data?.expiringQuotationsToday ?? 0}
                    icon={<ClockAlertIcon className="text-red-500" />}
                    trend="urgent"
                />
                <Kpi
                    label="Confirmed Groups with Payments Due"
                    value={data?.confirmedGroupsWithPaymentsDueToday ?? 0}
                    icon={<MoneyIcon className="text-green-500" />}
                    trend="neutral"
                />
                <Kpi
                    label="Quotes to Follow Up Today"
                    value={data?.quotationsForFollowUpToday ?? 0}
                    icon={<ChatBubbleIcon className="text-yellow-500" />}
                    trend="attention"
                />
            </div>

            {data && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ActionCard
                            onClick={() => navigate("/group-requests")}
                            label="View Requests"
                            icon={<DocIcon className="text-blue-600" />}
                            bg="bg-blue-100"
                        />
                        <ActionCard
                            onClick={() => navigate("/quotations")}
                            label="Manage Quotes"
                            icon={<FolderIcon className="text-green-600" />}
                            bg="bg-green-100"
                        />
                        <ActionCard
                            onClick={() => navigate("/groups")}
                            label="Group Management"
                            icon={<UsersIcon className="text-purple-600" />}
                            bg="bg-purple-100"
                        />
                        <ActionCard
                            onClick={() => navigate("/follow-ups")}
                            label="Follow Up"
                            icon={<ClockIcon className="text-yellow-600" />}
                            bg="bg-yellow-100"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/* -------------------- UI bits -------------------- */

function Kpi({
    label,
    value,
    icon,
    trend,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    trend: "up" | "down" | "neutral" | "urgent" | "attention";
}): JSX.Element {
    const trendColor =
        trend === "up"
            ? "text-green-600"
            : trend === "down" || trend === "urgent"
                ? "text-red-600"
                : trend === "attention"
                    ? "text-yellow-600"
                    : "text-gray-600";

    const TrendIcon =
        trend === "up"
            ? UpIcon
            : trend === "down" || trend === "urgent"
                ? DownIcon
                : trend === "attention"
                    ? WarningIcon
                    : StableIcon;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
                <div className={`flex items-center text-sm font-medium ${trendColor}`}>
                    <TrendIcon />
                    <span className="ml-1">
                        {trend === "up" && "Increasing"}
                        {trend === "down" && "Decreasing"}
                        {trend === "urgent" && "Urgent"}
                        {trend === "attention" && "Needs Attention"}
                        {trend === "neutral" && "Stable"}
                    </span>
                </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-sm text-gray-600">{label}</div>
        </div>
    );
}

function ActionCard({
    label,
    icon,
    onClick,
    bg,
}: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    bg: string;
}) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
            <div className={`${bg} p-3 rounded-full mb-2`}>{icon}</div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
    );
}

/* -------------------- Icons (inline SVG) -------------------- */

function RefreshIcon() {
    return (
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}
function ErrorIcon() {
    return (
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
            />
        </svg>
    );
}
function PlusCircleIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
        </svg>
    );
}
function ClockAlertIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
function MoneyIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
function ChatBubbleIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
    );
}
function UpIcon() {
    return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
    );
}
function DownIcon() {
    return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    );
}
function WarningIcon() {
    return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}
function StableIcon() {
    return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    );
}
function DocIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6l5 5v9a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
    );
}
function FolderIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l2 2h10v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
    );
}
function UsersIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}
function ClockIcon({ className = "" }) {
    return (
        <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
