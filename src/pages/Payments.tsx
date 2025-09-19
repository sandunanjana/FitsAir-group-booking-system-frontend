// src/pages/Payments.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listPayments,
  markPaymentPaid,
  uploadPaymentAttachment,
  downloadPaymentAttachment,
  listPaymentAttachments,
  type PaymentDTO,
  type PaymentAttachmentDTO,
} from "@/api/endpoints";
import { extractContent, type Page } from "@/types/page";

export default function Payments(): JSX.Element {
  const [rows, setRows] = useState<PaymentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // attachments modal
  const [attOpenFor, setAttOpenFor] = useState<PaymentDTO | null>(null);

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

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((p) => {
      const matchesSearch =
        p.id?.toString().includes(searchTerm) ||
        p.groupRequestId?.toString().includes(searchTerm) ||
        (p.amount ?? "").toString().includes(searchTerm) ||
        (p.reference ?? "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const statusOptions = ["ALL", "PENDING", "PAID", "OVERDUE"];

  async function onPaid(id: number): Promise<void> {
    const ref = window.prompt("Enter payment reference (optional):") ?? "";
    try {
      await markPaymentPaid(id, ref.trim() || undefined);
      await load();
      alert("Payment marked as paid successfully");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to mark payment as paid";
      alert(msg);
      console.error("Error marking payment as paid:", err);
    }
  }

  const getStatusColor = (status?: string) => {
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
  };

  const formatCurrency = (amount: string | number | undefined) => {
    if (amount == null) return "-";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return Number.isFinite(num)
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num as number)
      : String(amount);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const isOverdueByDateOnly = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Payment Management</h2>
        <button
          onClick={() => void load()}
          className="flex items-center text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh payments"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
              placeholder="Search by ID, Group ID, amount, reference..."
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
        <SkeletonTable />
      ) : filteredRows.length === 0 ? (
        <EmptyState hasFilter={!!searchTerm || statusFilter !== "ALL"} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto max-h=[calc(100vh-250px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>ID</Th>
                  <Th>Group ID</Th>
                  <Th>Amount</Th>
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                  <Th>Reference</Th>
                  <Th>Files</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((r) => {
                  const overdueByDate = r.status === "PENDING" && isOverdueByDateOnly(r.dueDate);
                  const displayStatus = overdueByDate ? "OVERDUE" : r.status;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <Td className="font-medium">#{r.id}</Td>
                      <Td>
                        <Link
                          to={`/group-requests/${r.groupRequestId}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:underline"
                          title="Open group request"
                        >
                          Group #{r.groupRequestId}
                        </Link>
                      </Td>
                      <Td className="font-bold">{formatCurrency(r.amount)}</Td>
                      <Td className={overdueByDate ? "text-red-600 font-medium" : ""}>
                        {formatDate(r.dueDate)}
                        {overdueByDate && <span className="ml-1 text-xs text-red-500">(Overdue)</span>}
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                          {displayStatus}
                        </span>
                      </Td>
                      <Td>{r.reference ?? "-"}</Td>
                      <Td>
                        <button
                          onClick={() => setAttOpenFor(r)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-sm px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Attachments
                        </button>
                      </Td>
                      <Td>
                        {r.status === "PENDING" && r.id && (
                          <button
                            onClick={() => void onPaid(r.id!)}
                            className="text-green-600 hover:text-green-900 font-medium text-sm px-3 py-1 rounded-md bg-green-50 hover:bg-green-100 transition-colors flex items-center"
                            title="Mark as paid"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Summary */}
      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Payments" value={rows.length} />
          <StatCard label="Pending" value={rows.filter((p) => p.status === "PENDING").length} accent="text-yellow-600" />
          <StatCard
            label="Overdue"
            value={rows.filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && isOverdueByDateOnly(p.dueDate))).length}
            accent="text-red-600"
          />
          <StatCard label="Paid" value={rows.filter((p) => p.status === "PAID").length} accent="text-green-600" />
        </div>
      )}

      {/* Attachments modal */}
      {attOpenFor && (
        <AttachmentsModal
          payment={attOpenFor}
          onClose={() => setAttOpenFor(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

/* ===================== Attachments Modal ===================== */

function AttachmentsModal({
  payment,
  onClose,
  onChanged,
}: {
  payment: PaymentDTO;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [list, setList] = useState<PaymentAttachmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!payment.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await listPaymentAttachments(payment.id);
      setList(data);
    } catch (err) {
      setError("Failed to load attachments");
      console.error("Attachments load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !payment.id) return;

    setUploading(true);
    setAttError(null);
    try {
      await uploadPaymentAttachment(payment.id, file);
      await load();      // refresh table immediately
      onChanged();       // let parent refresh counters
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Upload failed. Please try again.";
      setAttError(String(serverMsg));
      console.error("Upload error:", err);
    } finally {
      (e.target as HTMLInputElement).value = "";
      setUploading(false);
    }
  }

  async function onDownload(a: PaymentAttachmentDTO): Promise<void> {
    try {
      const { data, headers } = await downloadPaymentAttachment(a.id);
      const blob = new Blob([data], { type: a.contentType || (headers["content-type"] as string) || "application/octet-stream" });

      // filename from Content-Disposition; fallback to stored filename
      const cd: string | undefined = headers["content-disposition"] as any;
      let filename = a.filename || `attachment-${a.id}`;
      if (cd && /filename\*=UTF-8''/.test(cd)) {
        filename = decodeURIComponent(cd.split("filename*=")[1].split("''")[1]);
      } else if (cd && /filename=/.test(cd)) {
        const m = cd.match(/filename="?([^"]+)"?/);
        if (m?.[1]) filename = m[1];
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download attachment");
      console.error("Download error:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
            <p className="text-sm text-gray-500">
              Payment #{payment.id} · Group #{payment.groupRequestId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 rounded-md p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{uploading ? "Uploading..." : "Upload file"}</span>
              <input type="file" className="hidden" onChange={(e) => void onUpload(e)} disabled={uploading} />
            </label>

            {attError && <div className="text-sm text-red-600">{attError}</div>}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-72">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>ID</Th>
                    <Th>Filename</Th>
                    <Th>Type</Th>
                    <Th>Size</Th>
                    <Th>Uploaded</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <Td colSpan={6}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </Td>
                    </tr>
                  ) : list.length === 0 ? (
                    <tr>
                      <Td colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        No attachments yet. Upload your receipt, image, or supporting document.
                      </Td>
                    </tr>
                  ) : (
                    list.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <Td className="font-medium">#{a.id}</Td>
                        <Td className="font-medium">{a.filename}</Td>
                        <Td>{a.contentType}</Td>
                        <Td>{prettyBytes(a.size)}</Td>
                        <Td>{new Date(a.uploadedAt).toLocaleString()}</Td>
                        <Td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => void onDownload(a)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100"
                            >
                              Download
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== UI bits ===================== */
function SkeletonTable() { /* unchanged */ return (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-auto max-h-[calc(100vh-250px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th>ID</Th><Th>Group ID</Th><Th>Amount</Th><Th>Due Date</Th><Th>Status</Th><Th>Reference</Th><Th>Files</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              {[...Array(8)].map((_, j) => (
                <Td key={j}><div className="h-4 bg-gray-200 rounded animate-pulse"></div></Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);}

function EmptyState({ hasFilter }: { hasFilter: boolean }) { /* unchanged */ return (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
    <p className="mt-1 text-sm text-gray-500">
      {hasFilter ? "Try adjusting your search or filter criteria" : "No payments have been recorded yet"}
    </p>
  </div>
);}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">{children}</th>;
}
function Td({ children, className = "", ...rest }: React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode }) {
  return <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`} {...rest}>{children}</td>;
}
function StatCard({ label, value, accent = "text-gray-900" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;

}


// this is sandun's changeknm
