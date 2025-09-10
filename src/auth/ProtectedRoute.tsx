import { Navigate } from "react-router-dom";
import { useAuthStore, type Role } from "./store";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: Role[];
}): JSX.Element {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
