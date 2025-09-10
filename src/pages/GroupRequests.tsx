import { useEffect, useState, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import {
    deleteGroupRequest,
    listGroupRequests,
    updateGroupRequest,
    sendGroupRequestToRC,
    listUsersByRole,
    type GroupRequestDTO
} from "@/api/endpoints";
import { extractContent, type Page } from "@/types/page";
import { useAuthStore } from "@/auth/store";

export default function GroupRequests(): JSX.Element {
    const [rows, setRows] = useState<GroupRequestDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const { role } = useAuthStore();

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

    const filteredRows = rows.filter(row => {
        const matchesSearch = 
            row.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.route?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.posCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.assignedRcUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.id?.toString().includes(searchTerm);

        const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const statusOptions = ["ALL", "NEW", "REVIEWING", "QUOTED", "ACCEPTED", "REJECTED", "COMPLETED"];

    async function onDelete(id: number): Promise<void> {
        if (!confirm("Are you sure you want to delete this group request? This action cannot be undone.")) return;
        
        try {
            await deleteGroupRequest(id); 
            await load();
        } catch (err) {
            alert("Failed to delete group request");
            console.error("Error deleting group request:", err);
        }
    }

    async function onEdit(r: GroupRequestDTO): Promise<void> {
        const agent = prompt("Agent name:", r.agentName) ?? r.agentName;
        if (!agent) return;
        
        const route = prompt("Route:", r.route) ?? r.route;
        if (!route) return;
        
        try {
            await updateGroupRequest(r.id!, { ...r, agentName: agent, route });
            await load();
            alert("Group request updated successfully");
        } catch (err) {
            alert("Failed to update group request");
            console.error("Error updating group request:", err);
        }
    }

    async function onSendToRC(id: number): Promise<void> {
        try {
            const { data: rcs } = await listUsersByRole("ROUTE_CONTROLLER");
            const usernames: string[] = rcs.map((u: any) => u.username);
            
            if (usernames.length === 0) {
                alert("No Route Controllers available. Please contact an administrator.");
                return;
            }
            
            const rc = window.prompt(`Assign to which Route Controller?\n\nAvailable: ${usernames.join(", ")}\n\nType the username exactly:`);
            if (!rc) return;
            
            if (!usernames.includes(rc)) {
                alert(`"${rc}" is not a valid Route Controller. Please choose from: ${usernames.join(", ")}`);
                return;
            }
            
            await sendGroupRequestToRC(id, rc);
            await load();
            alert(`Request successfully assigned to ${rc}`);
        } catch (err) {
            alert("Failed to assign to Route Controller");
            console.error("Error assigning to RC:", err);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "NEW": return "bg-blue-100 text-blue-800";
            case "REVIEWING": return "bg-yellow-100 text-yellow-800";
            case "QUOTED": return "bg-purple-100 text-purple-800";
            case "ACCEPTED": return "bg-green-100 text-green-800";
            case "REJECTED": return "bg-red-100 text-red-800";
            case "COMPLETED": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Group Requests</h2>
                <button 
                    onClick={() => void load()}
                    className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Refresh data"
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
                            placeholder="Search by agent, route, email, POS, RC..."
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
                            {filteredRows.length} of {rows.length} requests
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
                                    <Th>ID</Th><Th>Agent</Th><Th>Route</Th><Th>Pax</Th>
                                    <Th>Req Date</Th><Th>Category</Th><Th>Status</Th>
                                    <Th>POS</Th><Th>Departure</Th><Th>Quoted Fare</Th><Th>Email</Th>
                                    <Th>Assigned RC</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(13)].map((_, j) => (
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No group requests found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || statusFilter !== "ALL" 
                            ? "Try adjusting your search or filter criteria" 
                            : "Get started by creating a new group request"
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
                                    <Th>Agent</Th>
                                    <Th>Route</Th>
                                    <Th>Pax</Th>
                                    <Th>Req Date</Th>
                                    <Th>Category</Th>
                                    <Th>Status</Th>
                                    <Th>POS</Th>
                                    <Th>Departure</Th>
                                    <Th>Quoted Fare</Th>
                                    <Th>Email</Th>
                                    <Th>Assigned RC</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <Td>
                                            {r.id ? (
                                                <Link 
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium underline"
                                                    to={`/group-requests/${r.id}`}
                                                >
                                                    #{r.id}
                                                </Link>
                                            ) : "-"}
                                        </Td>
                                        <Td className="font-medium">{r.agentName}</Td>
                                        <Td>{r.route}</Td>
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
                                        <Td className="font-medium">{r.quotedFare || "-"}</Td>
                                        <Td>{r.contactEmail}</Td>
                                        <Td>{r.assignedRcUsername || "-"}</Td>
                                        <Td>
                                            {role === "GROUP_DESK" && r.status === "NEW" && r.id && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button 
                                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                        onClick={() => void onEdit(r)}
                                                        title="Edit request"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                                                        onClick={() => void onDelete(r.id!)}
                                                        title="Delete request"
                                                    >
                                                        Delete
                                                    </button>
                                                    <button 
                                                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                                        onClick={() => void onSendToRC(r.id!)}
                                                        title="Send to Route Controller"
                                                    >
                                                        Send to RC
                                                    </button>
                                                </div>
                                            )}
                                        </Td>
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

function Th({ children, className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
    return (
        <th 
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`} 
            {...rest}
        >
            {children}
        </th>
    );
}

function Td({ children, className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
    return (
        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...rest}>
            {children}
        </td>
    );
}