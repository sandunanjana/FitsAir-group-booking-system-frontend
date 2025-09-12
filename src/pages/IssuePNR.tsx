// src/pages/IssuePNR.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    getGroupRequestDetails,
    sendPNRToAgent,
    type GroupRequestDetails as Details,
} from "@/api/endpoints";
import { useAuthStore } from "@/auth/store";

export default function IssuePNR(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
    const { role } = useAuthStore();

    const [lookupId, setLookupId] = useState<string>(params.id ?? "");
    const [data, setData] = useState<Details | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [pnr, setPnr] = useState<string>("");
    const [sending, setSending] = useState<boolean>(false);

    const canAct = role === "GROUP_DESK" || role === "ADMIN";

    async function load(idNum: number) {
        setLoading(true);
        setError(null);
        try {
            const { data } = await getGroupRequestDetails(idNum);
            setData(data);
        } catch (err) {
            setError("Failed to load group request details");
            // eslint-disable-next-line no-console
            console.error("Load details error:", err);
        } finally {
            setLoading(false);
        }
    }

    // If there is a route param, load on mount/param change
    useEffect(() => {
        if (params.id) {
            setLookupId(params.id);
            const idNum = Number(params.id);
            if (!Number.isNaN(idNum) && idNum > 0) {
                void load(idNum);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    // Existing PNR (back-end adds pnrCode on GroupRequestDTO)
    const existingPnr = useMemo(() => {
        return (data?.request as any)?.pnrCode as string | undefined;
    }, [data]);

    // Eligibility: at least one paid payment
    const hasAtLeastOnePaid = useMemo(() => {
        return (data?.payments ?? []).some((p) => p.status === "PAID");
    }, [data]);

    // Simple PNR validator (accepts 6–8 alphanumeric)
    const pnrValid = /^[A-Z0-9]{6,8}$/i.test(pnr.trim());

    function onFind() {
        const idNum = Number(lookupId);
        if (Number.isNaN(idNum) || idNum <= 0) {
            alert("Please enter a valid numeric Group Request ID");
            return;
        }
        navigate(`/pnr/${idNum}`);
    }

    async function onSendPNR() {
        if (!data?.request?.id) return;
        if (!canAct) {
            alert("Only Group Desk or Admin can issue a PNR.");
            return;
        }
        if (existingPnr) {
            alert("A PNR is already recorded for this request.");
            return;
        }
        if (!hasAtLeastOnePaid) {
            alert("At least one payment must be PAID before sending the PNR.");
            return;
        }
        if (!pnrValid) {
            alert("Please enter a valid PNR (6–8 alphanumeric characters).");
            return;
        }

        if (!confirm(`Send PNR "${pnr.trim().toUpperCase()}" to the agent?`)) return;

        try {
            setSending(true);
            await sendPNRToAgent(data.request.id, pnr.trim().toUpperCase());
            alert("PNR sent to the agent.");
            // reload to reflect persisted PNR fields
            await load(data.request.id);
            setPnr("");
        } catch (err: any) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to send PNR";
            alert(msg);
            // eslint-disable-next-line no-console
            console.error("Send PNR error:", err);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="p-6 space-y-6">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Issue PNR</h2>
                    <p className="text-sm text-gray-600">
                        Enter a Group Request ID, review eligibility, and send a PNR to the agent.
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Group Request ID"
                        className="w-44 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={lookupId}
                        onChange={(e) => setLookupId(e.target.value)}
                    />
                    <button
                        onClick={onFind}
                        className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                        Find
                    </button>
                </div>
            </header>

            {/* Data / state */}
            {loading ? (
                <div className="space-y-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : error ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.257 7.099A1 1 0 019.2 6h1.6a1 1 0 01.943 1.099l-.3 3a1 1 0 01-.998.901H9.555a1 1 0 01-.998-.901l-.3-3zM10 14a1 1 0 100 2 1 1 0 000-2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            ) : !data ? (
                <div className="text-sm text-gray-600">Enter an ID to load a Group Request.</div>
            ) : (
                <>
                    {/* Summary */}
                    <Card title={`Group Request #${data.request.id}`}>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Row k="Agent" v={data.request.agentName} />
                                <Row k="Email" v={data.request.contactEmail} />
                                <Row k="Phone" v={data.request.contactNumber ?? "-"} />
                                <Row k="Route" v={data.request.route} />
                                <Row k="Passengers" v={String(data.request.paxCount)} />
                                <Row k="POS" v={data.request.posCode} />
                            </div>
                            <div className="space-y-2">
                                <Row k="Status" v={data.request.status ?? "-"} />
                                <Row k="Assigned RC" v={data.request.assignedRcUsername ?? "-"} />
                                <Row k="Departure" v={data.request.departureDate} />
                                <Row k="Return" v={data.request.returnDate ?? "-"} />
                                <Row k="Currency" v={data.request.currency ?? "-"} />
                                <Row
                                    k="Existing PNR"
                                    v={existingPnr ? existingPnr : "— (none yet)"}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <Link
                                to={`/group-requests/${data.request.id}`}
                                className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                                View full request →
                            </Link>
                        </div>
                    </Card>

                    {/* Payments */}
                    <Card title="Payments">
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-auto max-h-72">
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
                                        {data.payments.length === 0 ? (
                                            <tr>
                                                <Td colSpan={5} className="text-center text-sm text-gray-500 py-6">
                                                    No payments created yet.
                                                </Td>
                                            </tr>
                                        ) : (
                                            data.payments.map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <Td className="font-medium">#{p.id}</Td>
                                                    <Td className="font-medium">{p.amount}</Td>
                                                    <Td>{p.dueDate}</Td>
                                                    <Td>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pill(p.status)}`}>
                                                            {p.status}
                                                        </span>
                                                    </Td>
                                                    <Td>{p.reference ?? "-"}</Td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-3">
                            {hasAtLeastOnePaid ? (
                                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
                                    ✓ Eligible to send PNR (at least one payment is PAID).
                                </div>
                            ) : (
                                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                                    ⚠️ Not eligible yet — at least one payment must be PAID.
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* PNR form */}
                    <Card title="Issue / Send PNR">
                        <div className="space-y-3">
                            <div className="text-sm text-gray-600">
                                Enter the PNR you wish to send to the agent. This will be emailed to{" "}
                                <span className="font-medium">{data.request.contactEmail}</span>.
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="PNR (e.g. ABC123)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                                    value={pnr}
                                    onChange={(e) => setPnr(e.target.value)}
                                    maxLength={10}
                                    disabled={!canAct || !!existingPnr || sending}
                                />
                                <button
                                    onClick={() => void onSendPNR()}
                                    disabled={!canAct || !!existingPnr || !hasAtLeastOnePaid || !pnrValid || sending}
                                    className={`px-4 py-2 rounded-md text-white font-medium ${!canAct || !!existingPnr || !hasAtLeastOnePaid || !pnrValid || sending
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : "bg-indigo-600 hover:bg-indigo-700"
                                        }`}
                                >
                                    {sending ? "Sending..." : existingPnr ? "Already Sent" : "Send PNR"}
                                </button>
                            </div>

                            {!pnrValid && pnr.length > 0 && (
                                <div className="text-xs text-red-600">
                                    PNR should be 6–8 alphanumeric characters.
                                </div>
                            )}

                            {!canAct && (
                                <div className="text-xs text-gray-500">
                                    Only Group Desk / Admin can issue PNRs.
                                </div>
                            )}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

/* =============== UI helpers =============== */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {title}
            </h3>
            {children}
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 py-2 border-b border-gray-100 last:border-b-0">
            <div className="text-sm font-medium text-gray-700 sm:col-span-1">{k}</div>
            <div className="text-sm text-gray-900 sm:col-span-3">{v || "-"}</div>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
            {children}
        </th>
    );
}
function Td({
    children,
    className = "",
    ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
    return (
        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...rest}>
            {children}
        </td>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
            ))}
        </div>
    );
}

function pill(status?: string) {
    switch (status) {
        case "PAID":
            return "bg-green-100 text-green-800";
        case "PENDING":
            return "bg-yellow-100 text-yellow-800";
        case "OVERDUE":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}
