import {
    useEffect,
    useState,
    type ReactNode,
    type ThHTMLAttributes,
    type TdHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import { listGroupRequests, type GroupRequestDTO } from "@/api/endpoints";
import { extractContent, type Page } from "@/types/page";

type DateField = "requestDate" | "departureDate";

export default function GroupRequests(): JSX.Element {
    const [rows, setRows] = useState<GroupRequestDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState<string>("");

    // NEW: date range filter state
    const [dateField, setDateField] = useState<DateField>("requestDate");
    const [fromDate, setFromDate] = useState<string>(""); // yyyy-MM-dd
    const [toDate, setToDate] = useState<string>("");     // yyyy-MM-dd

    async function load(): Promise<void> {
        setLoading(true);
        setError(null);
        try {
            const { data } = await listGroupRequests(0, 100);
            setRows(extractContent<GroupRequestDTO>(data as GroupRequestDTO[] | Page<GroupRequestDTO>));
        } catch (err) {
            setError("Failed to load group requests. Please try again.");
            console.error("Error loading group requests:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, []);

    /** Collapse routing into One-way / Return. MULTICITY counts as Return per your requirement. */
    const tripType = (r: GroupRequestDTO) => (r.routing === "ONE_WAY" ? "One-way" : "Return");

    const routingBadge = (routing?: string) =>
        routing === "MULTICITY" ? (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800">
                Multicity
            </span>
        ) : null;

    /** Currency formatter for Quoted Fare (shown only after GD accepts -> CONFIRMED/TICKETED) */
    const formatMoney = (amount?: string | number | null, currency?: string | null) => {
        if (amount == null) return "-";
        const n = typeof amount === "string" ? parseFloat(amount) : amount;
        if (!Number.isFinite(n)) return String(amount);
        const c = currency && currency.length === 3 ? currency : "LKR";
        return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n as number);
    };

    /** Match backend BookingStatus enum */
    const statusOptions = ["ALL", "NEW", "REVIEWING", "QUOTED", "CONFIRMED", "TICKETED", "CANCELLED", "CONFIRMED_PNR", "SETTLED"];

    const getStatusColor = (status?: string) => {
        switch (status) {
            case "NEW": return "bg-blue-100 text-blue-800";
            case "REVIEWING": return "bg-yellow-100 text-yellow-800";
            case "QUOTED": return "bg-purple-100 text-purple-800";
            case "CONFIRMED": return "bg-emerald-100 text-emerald-800";
            case "TICKETED": return "bg-green-100 text-green-800";
            case "CANCELLED": return "bg-gray-100 text-gray-800";
            case "CONFIRMED_PNR": return "bg-sky-100 text-sky-800";
            case "SETTLED": return "bg-emerald-100 text-emerald-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    // --- NEW: date helpers & predicate ---
    const inDateRange = (iso?: string | null) => {
        if (!fromDate && !toDate) return true;       // no date filter
        if (!iso) return false;
        // Compare as strings (safe for yyyy-MM-dd) to avoid timezone issues
        const v = iso.slice(0, 10);
        if (fromDate && v < fromDate) return false;
        if (toDate && v > toDate) return false;
        return true;
    };

    const filteredRows = rows.filter((row) => {
        const s = searchTerm.toLowerCase();
        const matchesSearch =
            row.agentName?.toLowerCase().includes(s) ||
            row.route?.toLowerCase().includes(s) ||
            row.contactEmail?.toLowerCase().includes(s) ||
            row.posCode?.toLowerCase().includes(s) ||
            row.assignedRcUsername?.toLowerCase().includes(s) ||
            tripType(row).toLowerCase().includes(s) ||
            row.id?.toString().includes(searchTerm);

        const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;

        // NEW: date field selection (requestDate or departureDate)
        const value = dateField === "requestDate" ? (row.requestDate as any) : (row.departureDate as any);
        const matchesDate = inDateRange(value);

        return matchesSearch && matchesStatus && matchesDate;
    });

    const clearDates = () => { setFromDate(""); setToDate(""); };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Group Requests</h2>
                <button
                    onClick={() => void load()}
                    className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh data"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Search by agent, route, email, POS, RC, trip type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {statusOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option === "ALL" ? "All Statuses" : option}
                                </option>
                            ))}
                        </select>

                        <div className="text-sm text-gray-600 flex items-center">
                            {filteredRows.length} of {rows.length} requests
                        </div>
                    </div>

                    {/* NEW: Date range */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={dateField}
                            onChange={(e) => setDateField(e.target.value as DateField)}
                            title="Choose which date to filter"
                        >
                            <option value="requestDate">Request Date</option>
                            <option value="departureDate">Departure Date</option>
                        </select>

                        <input
                            type="date"
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            placeholder="From"
                        />

                        <input
                            type="date"
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            placeholder="To"
                        />

                        <button
                            type="button"
                            onClick={clearDates}
                            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            title="Clear date range"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-250px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <Th>ID</Th><Th>Agent</Th><Th>Route</Th><Th>Trip</Th>
                                    <Th>Pax</Th><Th>Req Date</Th><Th>Category</Th><Th>Status</Th>
                                    <Th>POS</Th><Th>Departure</Th><Th>Quoted Fare</Th><Th>Email</Th><Th>Assigned RC</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(13)].map((_, j) => (
                                            <Td key={j}><div className="h-4 bg-gray-200 rounded animate-pulse" /></Td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No group requests found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || statusFilter !== "ALL" || fromDate || toDate
                            ? "Try adjusting your search, status, or date range"
                            : "Get started by creating a new group request"}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-250px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <Th>ID</Th><Th>Agent</Th><Th>Route</Th>
                                    <Th>Trip</Th>{/* One-way / Return (Multicity counts as Return) */}
                                    <Th>Pax</Th><Th>Req Date</Th><Th>Category</Th><Th>Status</Th>
                                    <Th>POS</Th><Th>Departure</Th><Th>Quoted Fare</Th><Th>Email</Th><Th>Assigned RC</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <Td>
                                            {r.id ? (
                                                <Link className="text-indigo-600 hover:text-indigo-900 font-medium underline" to={`/group-requests/${r.id}`}>
                                                    #{r.id}
                                                </Link>
                                            ) : ("-")}
                                        </Td>
                                        <Td className="font-medium">{r.agentName}</Td>
                                        <Td>{r.route}</Td>
                                        <Td>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                                {tripType(r)}
                                            </span>
                                            {routingBadge(r.routing as any)}
                                        </Td>
                                        <Td>{r.paxCount}</Td>
                                        <Td>{r.requestDate}</Td>
                                        <Td>{r.category}</Td>
                                        <Td>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(r.status ?? "")}`}>
                                                {r.status}
                                            </span>
                                        </Td>
                                        <Td>{r.posCode}</Td>
                                        <Td>{r.departureDate}</Td>
                                        <Td className="font-medium">
                                            {r.status === "CONFIRMED" || r.status === "TICKETED"
                                                ? formatMoney(r.quotedFare as any, r.currency || undefined)
                                                : "-"}
                                        </Td>
                                        <Td>{r.contactEmail}</Td>
                                        <Td>{r.assignedRcUsername || "-"}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- table cell helpers ---------- */
function Th({
    children,
    className = "",
    ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
    return (
        <th
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
            {...rest}
        >
            {children}
        </th>
    );
}

function Td({
    children,
    className = "",
    ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
    return (
        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...rest}>
            {children}
        </td>
    );
}
