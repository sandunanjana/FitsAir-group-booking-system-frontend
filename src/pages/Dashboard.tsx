import { useEffect, useState } from "react";
import { fetchDashboard, type DashboardStatsDTO } from "@/api/endpoints";

export default function Dashboard(): JSX.Element {
    const [data, setData] = useState<DashboardStatsDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchDashboard()
            .then(r => {
                setData(r.data);
                setError(null);
            })
            .catch(err => {
                setError("Failed to load dashboard data. Please try again.");
                console.error("Dashboard fetch error:", err);
            })
            .finally(() => setLoading(false));
    }, []);

    const refreshData = () => {
        setLoading(true);
        fetchDashboard()
            .then(r => {
                setData(r.data);
                setError(null);
            })
            .catch(err => {
                setError("Failed to refresh dashboard data.");
                console.error("Dashboard refresh error:", err);
            })
            .finally(() => setLoading(false));
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
                            <div className="h-8 bg-gray-300 rounded w-1/2 animate-pulse"></div>
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
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry
                    </button>
                </div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Dashboard Overview</h2>
                <button
                    onClick={refreshData}
                    className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh data"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Kpi 
                    label="New Requests Since Login" 
                    value={data?.newRequestsSinceLogin ?? 0} 
                    icon={
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    }
                    trend="up"
                />
                <Kpi 
                    label="Quotes Expiring Today" 
                    value={data?.expiringQuotationsToday ?? 0} 
                    icon={
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    trend="urgent"
                />
                <Kpi 
                    label="Confirmed Groups with Payments Due" 
                    value={data?.confirmedGroupsWithPaymentsDueToday ?? 0} 
                    icon={
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    trend="neutral"
                />
                <Kpi 
                    label="Quotes to Follow Up Today" 
                    value={data?.quotationsForFollowUpToday ?? 0} 
                    icon={
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    }
                    trend="attention"
                />
            </div>

            {data && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="bg-blue-100 p-3 rounded-full mb-2">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">View Requests</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="bg-green-100 p-3 rounded-full mb-2">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Manage Quotes</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="bg-purple-100 p-3 rounded-full mb-2">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Group Management</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="bg-yellow-100 p-3 rounded-full mb-2">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Follow Up</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Kpi({ 
    label, 
    value, 
    icon,
    trend 
}: { 
    label: string; 
    value: number; 
    icon: React.ReactNode;
    trend: "up" | "down" | "neutral" | "urgent" | "attention";
}): JSX.Element {
    const getTrendColor = () => {
        switch(trend) {
            case "up": return "text-green-600";
            case "down": return "text-red-600";
            case "urgent": return "text-red-600";
            case "attention": return "text-yellow-600";
            default: return "text-gray-600";
        }
    };

    const getTrendIcon = () => {
        switch(trend) {
            case "up": 
                return (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                );
            case "down": 
            case "urgent":
                return (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                );
            case "attention":
                return (
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            default: 
                return (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                );
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                    {icon}
                </div>
                <div className={`flex items-center text-sm font-medium ${getTrendColor()}`}>
                    {getTrendIcon()}
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