// src/pages/Quotations.tsx
import {
  useEffect,
  useState,
  type ReactNode,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
} from "react";
import {
    createQuotation,
    listQuotations,
    resendQuotation,
    resendQuotationSimple,
    updateQuoteStatus,
    sendQuotationToAgent,
    acceptQuotation,
    type QuotationDTO,
    type QuotationStatus,
} from "@/api/endpoints";
import { extractContent, type Page } from "@/types/page";
import { useAuthStore } from "@/auth/store";

export default function Quotations(): JSX.Element {
  const [rows, setRows] = useState<QuotationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { role } = useAuthStore();

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listQuotations(0, 100);
      setRows(
        extractContent<QuotationDTO>(
          data as QuotationDTO[] | Page<QuotationDTO>
        )
      );
    } catch (err) {
      setError("Failed to load quotations. Please try again.");
      console.error("Error loading quotations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = rows.filter((quotation) => {
    const matchesSearch =
      quotation.id?.toString().includes(searchTerm) ||
      quotation.groupRequestId?.toString().includes(searchTerm) ||
      quotation.totalFare?.toString().includes(searchTerm) ||
      (quotation.approvedBy ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (quotation.currency ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (quotation.note ?? "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || quotation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    "ALL",
    "DRAFT",
    "SENT",
    "EXPIRED",
    "ACCEPTED",
    "REJECTED",
    "RESENT",
  ];

  function toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function onCreate(): Promise<void> {
    const groupRequestIdInput = window.prompt("Group Request ID?") ?? "0";
    const groupRequestId = Number(groupRequestIdInput);

    if (isNaN(groupRequestId) || groupRequestId <= 0) {
      alert("Please enter a valid Group Request ID");
      return;
    }

    const totalFare = (window.prompt("Total Fare?") ?? "").trim();
    if (!totalFare || isNaN(Number(totalFare))) {
      alert("Please enter a valid total fare amount");
      return;
    }

    // NEW: currency + note
    const defaultCurrency = "LKR";
    const currency = (
      window.prompt(
        "Currency (3 letters, e.g. LKR, USD):",
        defaultCurrency
      ) ?? defaultCurrency
    )
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      alert("Currency must be a 3-letter code (e.g., LKR, USD)");
      return;
    }
    const note = (window.prompt("Note (optional):", "") ?? "").trim();

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600 * 1000);

    try {
      const dto: QuotationDTO = {
        groupRequestId,
        totalFare,
        createdDate: toYMD(now),
        expiryDate: toYMD(in48h),
        status: "DRAFT",
        currency, // NEW
        note: note || null, // NEW
      };
      await createQuotation(dto);
      await load();
      alert("Quotation created successfully");
    } catch (err) {
      alert("Failed to create quotation");
      console.error("Error creating quotation:", err);
    }
  }

  // Optional manual status editor (kept as-is)
  async function onStatus(id: number): Promise<void> {
    const options: QuotationStatus[] = [
      "DRAFT",
      "SENT",
      "EXPIRED",
      "ACCEPTED",
      "REJECTED",
      "RESENT",
    ];
    const s = (
      window.prompt(
        `New status? Options: ${options.join("|")}`,
        "ACCEPTED"
      ) ?? ""
    ).trim() as QuotationStatus;

    if (!options.includes(s)) {
      alert(`Invalid status. Please choose from: ${options.join(", ")}`);
      return;
    }

    const approvedBy = window.prompt("Approved by (optional)") ?? undefined;

    try {
      await updateQuoteStatus(id, s, approvedBy || undefined);
      await load();
      alert("Status updated successfully");
    } catch (err) {
      alert("Failed to update status");
      console.error("Error updating status:", err);
    }
  }

  async function onResend(id: number, groupRequestId: number): Promise<void> {
    if (role !== "GROUP_DESK") return;

    const hasNewFareNow = window.confirm(
      "Do you already have a NEW fare to set now?\n\nOK = Enter new fare now (OLD will be REJECTED)\nCancel = Resend to RC for re-quote"
    );

    if (hasNewFareNow) {
      const totalFare = (window.prompt("Enter the NEW total fare:") ?? "").trim();
      if (!totalFare || isNaN(Number(totalFare))) {
        alert("Please enter a valid total fare amount");
        return;
      }

      // NEW: currency + note for new fare
      const currency = (
        window.prompt("Currency (3 letters, e.g. LKR, USD):", "LKR") ?? "LKR"
      )
        .trim()
        .toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        alert("Currency must be a 3-letter code (e.g., LKR, USD)");
        return;
      }
      const note = (window.prompt("Note (optional):", "") ?? "").trim();

      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 3600 * 1000);

      try {
        await resendQuotation(id, {
          groupRequestId,
          totalFare,
          createdDate: toYMD(now),
          expiryDate: toYMD(in48h),
          status: "DRAFT",
          currency, // NEW
          note: note || null, // NEW
        });
        await load();
        alert("Old quotation REJECTED. New quotation created with the new fare.");
      } catch (err) {
        alert("Failed to resend with new fare");
        console.error("Error resending with new fare:", err);
      }
    } else {
      try {
        await resendQuotationSimple(id); // carry forward old currency/note
        await load();
        alert("Resent to RC for a fresh fare.");
      } catch (err) {
        alert("Failed to resend to RC");
        console.error("Error resending to RC:", err);
      }
    }
  }

  async function onSendToAgent(id: number): Promise<void> {
    if (role !== "GROUP_DESK") return; // RC cannot act
    if (!confirm("Send this quotation to the agent?")) return;

    try {
      await sendQuotationToAgent(id);
      await load();
      alert("Quotation sent to agent successfully");
    } catch (err) {
      alert("Failed to send quotation to agent");
      console.error("Error sending to agent:", err);
    }
  }

  async function onAccept(id: number): Promise<void> {
    if (role !== "GROUP_DESK") return;
    if (!confirm("Accept this quotation?")) return;

    try {
      await acceptQuotation(id); // backend sets ACCEPTED + approvedBy + payments
      await load();
      alert("Quotation accepted successfully");
    } catch (err) {
      alert("Failed to accept quotation");
      console.error("Error accepting quotation:", err);
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "EXPIRED":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "RESENT":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Quotation Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh quotations"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>

          {role === "ROUTE_CONTROLLER" ? null : (
            <button
              onClick={() => void onCreate()}
              className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              New Quotation
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search by ID, Group ID, amount, approved by, currency, note..."
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
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All Statuses" : option}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              {filteredRows.length} of {rows.length} quotations
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
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
                  <Th>ID</Th>
                  <Th>Group ID</Th>
                  <Th>Total</Th>
                  <Th>Created</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                  <Th>Approved By</Th>
                  <Th>Currency</Th>
                  <Th>Note</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
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
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No quotations found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your search or filter criteria"
              : "No quotations have been created yet"}
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
                  <Th>Total Fare</Th>
                  <Th>Created</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                  <Th>Approved By</Th>
                  <Th>Currency</Th>
                  <Th>Note</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((r) => {
                  const expired =
                    isExpired(r.expiryDate) &&
                    r.status !== "ACCEPTED" &&
                    r.status !== "REJECTED";
                  const displayStatus = expired ? "EXPIRED" : r.status;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <Td className="font-medium">#{r.id}</Td>
                      <Td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Group #{r.groupRequestId}
                        </span>
                      </Td>
                      <Td className="font-bold">
                        {r.totalFare} {r.currency ? r.currency : ""}
                      </Td>
                      <Td>{formatDate(r.createdDate)}</Td>
                      <Td className={expired ? "text-red-600 font-medium" : ""}>
                        {formatDate(r.expiryDate)}
                        {expired && (
                          <span className="ml-1 text-xs text-red-500">
                            (Expired)
                          </span>
                        )}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            displayStatus ?? ""
                          )}`}
                        >
                          {displayStatus}
                        </span>
                      </Td>
                      <Td>{r.approvedBy ?? "-"}</Td>
                      <Td>{r.currency ?? "-"}</Td>
                      <Td className="max-w-xs truncate" title={r.note ?? ""}>
                        {r.note ?? "-"}
                      </Td>
                      <Td>
                        {/* ACTIONS:
                            - RC: NO ACTIONS (hidden)
                            - GD: All actions where applicable
                         */}
                        {role === "GROUP_DESK" && r.id && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => void onSendToAgent(r.id!)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Send to agent"
                              disabled={displayStatus !== "DRAFT"}
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                              </svg>
                              To Agent
                            </button>
                            <button
                              onClick={() => void onAccept(r.id!)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium px-2 py-1 rounded-md bg-green-50 hover:bg-green-100 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Accept quotation"
                              disabled={displayStatus !== "SENT"}
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Accept
                            </button>

                            {(displayStatus === "EXPIRED" ||
                              displayStatus === "REJECTED" ||
                              displayStatus === "DRAFT" ||
                              displayStatus === "SENT") && (
                              <button
                                onClick={() =>
                                  void onResend(r.id!, r.groupRequestId)
                                }
                                className="text-purple-600 hover:text-purple-900 text-sm font-medium px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 transition-colors flex items-center"
                                title="Resend quotation (set new fare now or resend to RC)"
                              >
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                Resend
                              </button>
                            )}
                          </div>
                        )}

                        {/* Optional manual status editor for GD:
                        {role === "GROUP_DESK" && (
                          <button
                            onClick={() => void onStatus(r.id!)}
                            className="ml-2 text-blue-600 hover:text-blue-900 text-sm font-medium px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            Status
                          </button>
                        )} */}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Quotations" value={rows.length} />
          <StatCard
            label="Draft"
            value={rows.filter((q) => q.status === "DRAFT").length}
            accent="text-gray-600"
          />
          <StatCard
            label="Sent"
            value={rows.filter((q) => q.status === "SENT").length}
            accent="text-blue-600"
          />
          <StatCard
            label="Accepted"
            value={rows.filter((q) => q.status === "ACCEPTED").length}
            accent="text-green-600"
          />
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 ${className}`}
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
    <td
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

function StatCard({
  label,
  value,
  accent = "text-gray-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
