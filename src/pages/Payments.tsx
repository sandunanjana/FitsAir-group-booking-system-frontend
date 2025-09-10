import { useEffect, useState } from "react";
import { listPayments, markPaymentPaid, type PaymentDTO } from "@/api/endpoints";
import { extractContent, type Page } from "@/types/page";

export default function Payments(): JSX.Element {
    const [rows, setRows] = useState<PaymentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState<string>("");

    async function load(): Promise<void> {
        setLoading(true);
        setError(null);
        try {
            const { data } = await listPayments(0, 100);
            setRows(extractContent<PaymentDTO>(data as PaymentDTO[] | Page<PaymentDTO>));
        } catch (err) {
            setError("Failed to load payments. Please try again.");
            console.error("Error loading payments:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, []);

    const filteredRows = rows.filter(payment => {
        const matchesSearch = 
            payment.id?.toString().includes(searchTerm) ||
            payment.groupRequestId?.toString().includes(searchTerm) ||
            payment.amount?.toString().includes(searchTerm) ||
            payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || payment.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const statusOptions = ["ALL", "PENDING", "PAID", "OVERDUE", "CANCELLED"];

    async function onPaid(id: number): Promise<void> {
        const ref = window.prompt("Enter payment reference (optional) or leave blank:") ?? "";
        
        if (ref === null) return; // User cancelled
        
        try {
            await markPaymentPaid(id, ref.trim() || undefined);
            await load();
            alert("Payment marked as paid successfully");
        } catch (err) {
            alert("Failed to mark payment as paid");
            console.error("Error marking payment as paid:", err);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PAID": return "bg-green-100 text-green-800";
            case "PENDING": return "bg-yellow-100 text-yellow-800";
            case "OVERDUE": return "bg-red-100 text-red-800";
            case "CANCELLED": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const isOverdue = (dueDate: string) => {
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Payment Management</h2>
                <button 
                    onClick={() => void load()}
                    className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh payments"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Search by ID, amount, reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {statusOptions.map(option => (
                                <option key={option} value={option}>
                                    {option === "ALL" ? "All Statuses" : option}
                                </option>
                            ))}
                        </select>
                        
                        <div className="text-sm text-gray-600 flex items-center">
                            {filteredRows.length} of {rows.length} payments
                        </div>
                    </div>
                </div>
            </div>

            {error && (
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
            )}

            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-250px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>ID</Th><Th>Group ID</Th><Th>Amount</Th><Th>Due Date</Th><Th>Status</Th><Th>Reference</Th><Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <Td key={j}>
                                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                            </Td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || statusFilter !== "ALL" 
                            ? "Try adjusting your search or filter criteria" 
                            : "No payments have been recorded yet"
                        }
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-250px)]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>ID</Th>
                                    <Th>Group ID</Th>
                                    <Th>Amount</Th>
                                    <Th>Due Date</Th>
                                    <Th>Status</Th>
                                    <Th>Reference</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRows.map((r) => {
                                    const overdue = r.status === "PENDING" && isOverdue(r.dueDate);
                                    const displayStatus = overdue ? "OVERDUE" : r.status;
                                    
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <Td className="font-medium">#{r.id}</Td>
                                            <Td>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Group #{r.groupRequestId}
                                                </span>
                                            </Td>
                                            <Td className="font-bold">{formatCurrency(r.amount)}</Td>
                                            <Td className={overdue ? "text-red-600 font-medium" : ""}>
                                                {formatDate(r.dueDate)}
                                                {overdue && (
                                                    <span className="ml-1 text-xs text-red-500">(Overdue)</span>
                                                )}
                                            </Td>
                                            <Td>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus ?? "")}`}>
                                                    {displayStatus}
                                                </span>
                                            </Td>
                                            <Td>{r.reference ?? "-"}</Td>
                                            <Td>
                                                {r.status === "PENDING" && r.id && (
                                                    <button 
                                                        onClick={() => void onPaid(r.id!)}
                                                        className="text-green-600 hover:text-green-900 font-medium text-sm px-3 py-1 rounded-md bg-green-50 hover:bg-green-100 transition-colors flex items-center"
                                                        title="Mark as paid"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Mark Paid
                                                    </button>
                                                )}
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {rows.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-sm font-medium text-gray-600">Total Payments</div>
                        <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-sm font-medium text-gray-600">Pending</div>
                        <div className="text-2xl font-bold text-yellow-600">
                            {rows.filter(p => p.status === "PENDING").length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-sm font-medium text-gray-600">Overdue</div>
                        <div className="text-2xl font-bold text-red-600">
                            {rows.filter(p => p.status === "PENDING" && isOverdue(p.dueDate)).length}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="text-sm font-medium text-gray-600">Paid</div>
                        <div className="text-2xl font-bold text-green-600">
                            {rows.filter(p => p.status === "PAID").length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }): JSX.Element { 
    return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
            {children}
        </th>
    ); 
}

function Td({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element { 
    return (
        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900${className ? ` ${className}` : ""}`}>
            {children}
        </td>
    ); 
}