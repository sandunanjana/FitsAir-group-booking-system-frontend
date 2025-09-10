import { ReactNode, TdHTMLAttributes, ThHTMLAttributes, useEffect, useMemo, useState } from "react";
import { useAuthStore, type Role } from "@/auth/store";
import { api } from "@/api/client";
import ProtectedRoute from "@/auth/ProtectedRoute";

// ---------- Types ----------
type AppUser = {
  id: number;
  username: string;
  role: Role;
  enabled: boolean;
};

type CreateUserPayload = {
  username: string;
  password: string;
  role: Role;
};

// ---------- Small API helpers (adjust if your backend routes differ) ----------
async function fetchUsers(): Promise<AppUser[]> {
  const { data } = await api.get<AppUser[]>("/api/admin/users");
  return data;
}
async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  const { data } = await api.post<AppUser>("/api/admin/users", payload);
  return data;
}
async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}
async function setEnabled(id: number, value: boolean): Promise<void> {
  await api.patch(`/api/admin/users/${id}/enabled`, null, { params: { value } });
}
async function resetPassword(id: number, password: string): Promise<void> {
  await api.patch(`/api/admin/users/${id}/password`, { password });
}

// ---------- UI ----------
const ROLES: Role[] = ["GROUP_DESK", "ROUTE_CONTROLLER", "ADMIN"];

export default function AdminUsers(): JSX.Element {
  // Guard: only ADMIN can access
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <AdminUsersInner />
    </ProtectedRoute>
  );
}

function AdminUsersInner(): JSX.Element {
  const { role } = useAuthStore();
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [onlyActive, setOnlyActive] = useState(false);

  // create drawer/modal state
  const [openNew, setOpenNew] = useState(false);
  const [nu, setNu] = useState<CreateUserPayload>({
    username: "",
    password: "",
    role: "GROUP_DESK",
  });
  const [err, setErr] = useState("");

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUsers();
      setRows(list);
    } catch (err) {
      setError("Failed to load users. Please try again.");
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter(u => u.username.toLowerCase().includes(s));
    }
    if (roleFilter !== "ALL") {
      out = out.filter(u => u.role === roleFilter);
    }
    if (onlyActive) {
      out = out.filter(u => u.enabled);
    }
    return out;
  }, [rows, q, roleFilter, onlyActive]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!nu.username || !nu.password) {
      setErr("Username and password are required.");
      return;
    }
    if (nu.password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    try {
      await createUser(nu);
      setOpenNew(false);
      setNu({ username: "", password: "", role: "GROUP_DESK" });
      await load();
    } catch (e) {
      setErr("Failed to create user. Make sure the username is unique.");
    }
  }

  function handleResetPassword(u: AppUser) {
    setConfirmDialog({
      open: true,
      title: "Reset Password",
      message: `Enter new password for ${u.username}:`,
      onConfirm: () => {
        const pw = (document.getElementById("password-input") as HTMLInputElement)?.value;
        if (!pw || pw.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
        }
        resetPassword(u.id, pw.trim());
        setConfirmDialog({ ...confirmDialog, open: false });
        alert("Password updated.");
      },
    });
  }

  function handleToggleEnabled(u: AppUser) {
    setConfirmDialog({
      open: true,
      title: u.enabled ? "Disable User" : "Enable User",
      message: `Are you sure you want to ${u.enabled ? "disable" : "enable"} ${u.username}?`,
      onConfirm: async () => {
        await setEnabled(u.id, !u.enabled);
        setConfirmDialog({ ...confirmDialog, open: false });
        await load();
      },
    });
  }

  function handleDelete(u: AppUser) {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      message: `Are you sure you want to delete user "${u.username}"? This action cannot be undone.`,
      onConfirm: async () => {
        await deleteUser(u.id);
        setConfirmDialog({ ...confirmDialog, open: false });
        await load();
      },
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">User Management</h2>
        {role === "ADMIN" && (
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2.5 flex items-center transition-colors"
            onClick={() => setOpenNew(true)}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px] gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input 
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              placeholder="Search by username…" 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
          </div>
          
          <select 
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
            value={roleFilter} 
            onChange={e => setRoleFilter((e.target.value as Role | "ALL"))}
          >
            <option value="ALL">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          
          <label className="flex items-center gap-2 p-2">
            <input 
              type="checkbox" 
              checked={onlyActive} 
              onChange={e => setOnlyActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">Active users only</span>
          </label>
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-250px)]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>ID</Th>
                <Th>Username</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-gray-500">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2">No users found</p>
                    {rows.length > 0 && <p className="text-sm">Try adjusting your search or filter</p>}
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-medium text-gray-900">#{u.id}</Td>
                  <Td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-indigo-800">{u.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{u.username}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {u.role}
                    </span>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {u.enabled ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                        onClick={() => handleResetPassword(u)}
                        title="Reset password"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button 
                        className={u.enabled ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900 font-medium text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors"}
                        onClick={() => handleToggleEnabled(u)}
                        title={u.enabled ? "Disable user" : "Enable user"}
                      >
                        {u.enabled ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900 font-medium text-sm p-2 rounded-lg hover:bg-red-50 transition-colors"
                        onClick={() => handleDelete(u)}
                        title="Delete user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create user modal */}
      {openNew && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
              <button 
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
                onClick={() => setOpenNew(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  value={nu.username} 
                  onChange={e => setNu({ ...nu, username: e.target.value })} 
                  placeholder="Enter username" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                  type="password" 
                  value={nu.password} 
                  onChange={e => setNu({ ...nu, password: e.target.value })} 
                  placeholder="Enter password (min 6 characters)" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white" 
                  value={nu.role} 
                  onChange={e => setNu({ ...nu, role: e.target.value as Role })}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {err && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{err}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => setOpenNew(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 animate-scaleIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-4">{confirmDialog.message}</p>
            
            {confirmDialog.title === "Reset Password" && (
              <div className="mb-4">
                <input
                  id="password-input"
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 ${className}`} {...rest}>
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