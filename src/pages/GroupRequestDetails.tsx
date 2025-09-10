// pages/GroupRequestDetails.tsx
import { useEffect, useState, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getGroupRequestDetails,
    sendGroupRequestToRC,
    deleteGroupRequest,
    createQuotation,
    sendQuotationToAgent,
    acceptQuotation,
    listUsersByRole,
    type GroupRequestDetails as Details,
    type QuotationDTO
} from "@/api/endpoints";
import { useAuthStore } from "@/auth/store";

export default function GroupRequestDetails(): JSX.Element {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<Details | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { role } = useAuthStore();

    async function load(): Promise<void> {
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await getGroupRequestDetails(Number(id));
            setData(data);
            setError(null);
        } catch (err) {
            setError("Failed to load group request details");
            console.error("Error loading group request:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, [id]);

    async function onSendToRC(): Promise<void> {
        try {
            const { data: rcs } = await listUsersByRole("ROUTE_CONTROLLER");
            const usernames: string[] = rcs.map((u: any) => u.username);

            // Create a modal-like selection instead of prompt
            const rc = window.prompt(`Assign to which Route Controller?\n\nAvailable: ${usernames.join(", ")}`);
            if (!rc) return;

            if (!usernames.includes(rc)) {
                alert(`"${rc}" is not a valid Route Controller. Please choose from: ${usernames.join(", ")}`);
                return;
            }

            await sendGroupRequestToRC(Number(id), rc);
            await load();
            alert(`Request successfully assigned to ${rc}`);
        } catch (err) {
            alert("Failed to assign to Route Controller");
            console.error("Error assigning to RC:", err);
        }
    }

    function toYMD(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    async function onProvideQuotation(): Promise<void> {
        const totalFare = (window.prompt("Total Fare?") ?? "").trim();
        if (!totalFare) return;

        if (isNaN(Number(totalFare))) {
            alert("Please enter a valid number for total fare");
            return;
        }

        const now = new Date();
        const in48h = new Date(now.getTime() + 48 * 3600 * 1000);

        try {
            const dto: QuotationDTO = {
                groupRequestId: Number(id),
                totalFare,
                createdDate: toYMD(now),
                expiryDate: toYMD(in48h),
                status: "DRAFT",
            };
            await createQuotation(dto);
            await load();
            alert("Quotation created successfully");
        } catch (err) {
            alert("Failed to create quotation");
            console.error("Error creating quotation:", err);
        }
    }

    async function onSendToAgent(qid: number): Promise<void> {
        try {
            await sendQuotationToAgent(qid);
            await load();
            alert("Quotation sent to agent successfully");
        } catch (err) {
            alert("Failed to send quotation to agent");
            console.error("Error sending to agent:", err);
        }
    }

    async function onAccept(qid: number): Promise<void> {
        if (!confirm("Are you sure you want to accept this quotation?")) return;

        try {
            await acceptQuotation(qid);
            await load();
            alert("Quotation accepted successfully");
        } catch (err) {
            alert("Failed to accept quotation");
            console.error("Error accepting quotation:", err);
        }
    }

    async function onDelete(): Promise<void> {
        if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

        try {
            await deleteGroupRequest(Number(id));
            navigate("/group-requests");
            alert("Request deleted successfully");
        } catch (err) {
            alert("Failed to delete request");
            console.error("Error deleting request:", err);
        }
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
                    </div>
                    <div className="space-x-2">
                        <div className="h-10 bg-gray-200 rounded w-24 inline-block animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded w-32 inline-block animate-pulse"></div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="border rounded-xl p-4">
                            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                            {[...Array(10)].map((_, j) => (
                                <div key={j} className="grid grid-cols-3 gap-2 py-2">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded col-span-2 animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {[...Array(2)].map((_, i) => (
                    <div key={i} className="border rounded-xl p-4">
                        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error || "Failed to load group request details"}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => void load()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const r = data.request;
    const statusColors = {
        NEW: "bg-blue-100 text-blue-800",
        REVIEWING: "bg-yellow-100 text-yellow-800",
        QUOTED: "bg-purple-100 text-purple-800",
        ACCEPTED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
        COMPLETED: "bg-gray-100 text-gray-800",
    };

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">Group Request #{r.id}</h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}>
                            {r.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">{r.agentName}</span> · {r.route} · {r.paxCount} passengers
                        {r.assignedRcUsername && ` · Assigned to: ${r.assignedRcUsername}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {role === "GROUP_DESK" && r.status === "NEW" && (
                        <>
                            <button
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center"
                                onClick={() => void onDelete()}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </button>
                            <button
                                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors flex items-center"
                                onClick={() => void onSendToRC()}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Send to RC
                            </button>
                        </>
                    )}
                    {role === "ROUTE_CONTROLLER" && r.status === "REVIEWING" && (
                        <button
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center"
                            onClick={() => void onProvideQuotation()}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Provide Quotation
                        </button>
                    )}
                </div>
            </header>

            <section className="grid md:grid-cols-2 gap-6">
                <Card title="Request Details">
                    <Row k="Title" v={r.salutation ?? "-"} />
                    <Row k="First name" v={r.firstName ?? "-"} />
                    <Row k="Last name" v={r.lastName ?? "-"} />
                    <Row k="Email" v={r.contactEmail} />
                    <Row k="Phone" v={r.contactNumber ?? "-"} />
                    <Row k="From" v={r.fromAirport ?? "-"} />
                    <Row k="To" v={r.toAirport ?? "-"} />
                    <Row k="Routing" v={r.routing ?? "-"} />
                    <Row k="Departure" v={r.departureDate} />
                    <Row k="Return" v={r.returnDate ?? "-"} />
                    <Row k="Pax (A/C/I)" v={`${r.paxAdult ?? 0}/${r.paxChild ?? 0}/${r.paxInfant ?? 0}`} />
                    <Row k="POS" v={r.posCode} />
                    <Row k="Currency" v={r.currency ?? "-"} />
                    <Row k="Group Type" v={r.groupType ?? "-"} />
                    <Row k="Category" v={r.category} />
                    <Row k="Partner ID" v={r.partnerId ?? "-"} />
                    <Row k="Assigned RC" v={r.assignedRcUsername ?? "-"} />
                    <Row k="Special Requests" v={r.specialRequest ?? "-"} />
                </Card>

                <Card title="Payments">
                    <div className="overflow-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>ID</Th>
                                    <Th>Amount</Th>
                                    <Th>Due</Th>
                                    <Th>Status</Th>
                                    <Th>Reference</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.payments.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <Td>{p.id}</Td>
                                        <Td className="font-medium">{p.amount}</Td>
                                        <Td>{p.dueDate}</Td>
                                        <Td>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {p.status}
                                            </span>
                                        </Td>
                                        <Td>{p.reference ?? "-"}</Td>
                                    </tr>
                                ))}
                                {data.payments.length === 0 && (
                                    <tr>
                                        <Td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No payments recorded yet
                                        </Td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Itinerary Segments</h3>
                <div className="overflow-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <Th>#</Th>
                                <Th>From</Th>
                                <Th>To</Th>
                                <Th>Departure</Th>
                                <Th>Extras</Th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.segments.map((s, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <Td>{i + 1}</Td>
                                    <Td className="font-medium">{s.from}</Td>
                                    <Td className="font-medium">{s.to}</Td>
                                    <Td>{s.date}</Td>
                                    <Td className="text-xs max-w-xs">
                                        <div className="space-y-1">
                                            {s.extras?.extraBaggageKg && (
                                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                                    Baggage: {s.extras.extraBaggageKg}kg
                                                </div>
                                            )}
                                            {s.extras?.meal && (
                                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">
                                                    Meal: {s.extras.meal}
                                                </div>
                                            )}
                                            {s.extras?.notes && (
                                                <div className="mt-1 text-gray-600">
                                                    Notes: {s.extras.notes}
                                                </div>
                                            )}
                                            {!s.extras?.extraBaggageKg && !s.extras?.meal && !s.extras?.notes && "-"}
                                        </div>
                                    </Td>
                                </tr>
                            ))}
                            {data.segments.length === 0 && (
                                <tr>
                                    <Td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No itinerary segments added
                                    </Td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quotations</h3>
                    <span className="text-sm text-gray-500">{data.quotations.length} quotation(s)</span>
                </div>
                <div className="overflow-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <Th>ID</Th>
                                <Th>Total Fare</Th>
                                <Th>Created</Th>
                                <Th>Expiry</Th>
                                <Th>Status</Th>
                                <Th>Approved By</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.quotations.map(q => {
                                const isExpired = new Date(q.expiryDate) < new Date();
                                const quotationStatus = isExpired && q.status !== "ACCEPTED" ? "EXPIRED" : q.status;

                                const statusColorMap: Record<string, string> = {
                                    DRAFT: "bg-gray-100 text-gray-800",
                                    SENT: "bg-blue-100 text-blue-800",
                                    ACCEPTED: "bg-green-100 text-green-800",
                                    REJECTED: "bg-red-100 text-red-800",
                                    EXPIRED: "bg-yellow-100 text-yellow-800",
                                };

                                const statusColor =
                                    statusColorMap[quotationStatus as keyof typeof statusColorMap] ??
                                    "bg-gray-100 text-gray-800";


                                return (
                                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                                        <Td className="font-medium">#{q.id}</Td>
                                        <Td className="font-bold">{q.totalFare}</Td>
                                        <Td>{q.createdDate}</Td>
                                        <Td className={isExpired ? "text-red-600 font-medium" : ""}>{q.expiryDate}</Td>
                                        <Td>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                                {quotationStatus}
                                            </span>
                                        </Td>
                                        <Td>{q.approvedBy ?? "-"}</Td>
                                        <Td>
                                            {role === "GROUP_DESK" && q.id && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                        onClick={() => void onSendToAgent(q.id!)}
                                                        disabled={quotationStatus !== "DRAFT"}
                                                        title={quotationStatus !== "DRAFT" ? "Only draft quotations can be sent" : "Send to agent"}
                                                    >
                                                        Send to Agent
                                                    </button>
                                                    <button
                                                        className="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                        onClick={() => void onAccept(q.id!)}
                                                        disabled={quotationStatus !== "SENT"}
                                                        title={quotationStatus !== "SENT" ? "Only sent quotations can be accepted" : "Accept quotation"}
                                                    >
                                                        Accept
                                                    </button>
                                                </div>
                                            )}
                                        </Td>
                                    </tr>
                                );
                            })}
                            {data.quotations.length === 0 && (
                                <tr>
                                    <Td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No quotations created yet
                                    </Td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Card({ title, children }: { title: string; children: ReactNode }): JSX.Element {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h3>
            {children}
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }): JSX.Element {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 py-3 border-b border-gray-100 last:border-b-0">
            <div className="text-sm font-medium text-gray-700 sm:col-span-1">{k}</div>
            <div className="text-sm text-gray-900 sm:col-span-3">{v || "-"}</div>
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