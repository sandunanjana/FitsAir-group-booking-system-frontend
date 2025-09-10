import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Dashboard from "@/pages/Dashboard";
import GroupRequests from "@/pages/GroupRequests";
import GroupRequestDetails from "@/pages/GroupRequestDetails";
import Payments from "@/pages/Payments";
import Quotations from "@/pages/Quotations";
import ProtectedRoute from "@/auth/ProtectedRoute";
import PublicGroupBookingForm from "@/pages/PublicGroupBookingForm";
import Login from "./pages/login";
import AdminUsers from "./pages/AdminUsers";
//import AdminUsers from "@/pages/AdminUsers"; // <-- NEW

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/request", element: <PublicGroupBookingForm /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "group-requests", element: <GroupRequests /> },
      { path: "group-requests/:id", element: <GroupRequestDetails /> },
      { path: "quotations", element: <Quotations /> },
      { path: "payments", element: <Payments /> },

      // NEW: Admin-only route
      {
        path: "admin/users",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminUsers />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
