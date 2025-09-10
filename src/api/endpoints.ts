import { api } from "./client";

/** ===== Enums (shared with backend) ===== */
export type BookingStatus = "NEW" | "REVIEWING" | "QUOTED" | "CONFIRMED" | "TICKETED" | "CANCELLED";
export type RequestCategory = "NORMAL" | "GSA" | "CUSTOMER_CARE" | "AGENT";
export type QuotationStatus = "DRAFT" | "SENT" | "EXPIRED" | "ACCEPTED" | "REJECTED" | "RESENT";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE";
export type Salutation = "MR" | "MRS" | "MISS" | "MS" | "DR" | "PROF" | "OTHER";
export type RoutingType = "ONE_WAY" | "RETURN" | "MULTICITY";
export type GroupType = "EDUCATION" | "CONFERENCE" | "SPORTS" | "PILGRIMAGE" | "MICE" | "OTHER";

/** ===== Core DTOs ===== */
export type GroupRequestDTO = {
  id?: number;

  // contact
  salutation?: Salutation;
  firstName?: string;
  lastName?: string;
  contactEmail: string;
  contactNumber?: string;

  // itinerary summary
  agentName: string;
  fromAirport?: string;
  toAirport?: string;
  route: string;
  routing?: RoutingType;

  paxCount: number;
  paxAdult?: number;
  paxChild?: number;
  paxInfant?: number;

  requestDate: string;
  category: RequestCategory;
  status?: BookingStatus;

  posCode: string;
  departureDate: string;
  returnDate?: string;

  currency?: string;
  groupType?: GroupType;
  flightNumber?: string;
  specialRequest?: string;
  partnerId?: string;

  quotedFare: string | null;

  /** NEW: assigned Route Controller username */
  assignedRcUsername?: string;
};

export type QuotationDTO = {
  id?: number;
  groupRequestId: number;
  totalFare: string;
  createdDate: string;
  expiryDate: string;
  status?: QuotationStatus;
  approvedBy?: string;
};

export type PaymentDTO = {
  id?: number;
  groupRequestId: number;
  amount: string;
  dueDate: string;
  status?: PaymentStatus;
  reference?: string;
};

/** ===== Segments for public itinerary ===== */
export type Segment = {
  from: string;
  to: string;
  date: string;
  extras?: {
    extraBaggageKg?: number;
    meal?: string;
    notes?: string;
  };
};

/** ===== Dashboard ===== */
export type DashboardStatsDTO = {
  newRequestsSinceLogin: number;
  expiringQuotationsToday: number;
  confirmedGroupsWithPaymentsDueToday: number;
  quotationsForFollowUpToday: number;
};
export const fetchDashboard = () => api.get<DashboardStatsDTO>("/api/dashboard/stats");

/** ===== Admin users (for RC picker) ===== */
export type RoleForQuery = "ROUTE_CONTROLLER" | "GROUP_DESK" | "ADMIN";
// export const listUsersByRole = (role?: RoleForQuery) =>
//   api.get(`/api/admin/users${role ? `?role=${role}` : ""}`);

/** ===== Group Requests ===== */
export const listGroupRequests = (page=0, size=20) =>
  api.get(`/api/group-requests?page=${page}&size=${size}`);
export const getGroupRequest = (id: number) =>
  api.get<GroupRequestDTO>(`/api/group-requests/${id}`);

export type GroupRequestDetails = {
  request: GroupRequestDTO;
  quotations: QuotationDTO[];
  payments: PaymentDTO[];
  segments: Segment[];
};
export const getGroupRequestDetails = (id: number) =>
  api.get<GroupRequestDetails>(`/api/group-requests/${id}/details`);

export const createGroupRequest = (dto: GroupRequestDTO) =>
  api.post<GroupRequestDTO>("/api/group-requests", dto);
export const updateGroupRequest = (id: number, dto: GroupRequestDTO) =>
  api.put<GroupRequestDTO>(`/api/group-requests/${id}`, dto);
export const deleteGroupRequest = (id: number) =>
  api.delete(`/api/group-requests/${id}`);

/** NEW SIGNATURE: requires RC username to assign */
// export const sendGroupRequestToRC = (id: number, rcUsername: string) =>
//   api.patch(`/api/group-requests/${id}/send-to-rc?rc=${encodeURIComponent(rcUsername)}`);

export const markGroupRequestTicketed = (id: number) =>
  api.patch(`/api/group-requests/${id}/mark-ticketed`);

/** ===== Quotations ===== */
export const listQuotations = (page=0, size=20) =>
  api.get(`/api/quotations?page=${page}&size=${size}`);
export const getQuotation = (id: number) =>
  api.get<QuotationDTO>(`/api/quotations/${id}`);
export const createQuotation = (dto: QuotationDTO) =>
  api.post<QuotationDTO>("/api/quotations", dto);
export const updateQuoteStatus = (id: number, status: QuotationStatus, approvedBy?: string) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/status?status=${status}${approvedBy ? `&approvedBy=${encodeURIComponent(approvedBy)}` : ""}`);
export const resendQuotation = (id: number, dto: QuotationDTO) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/resend`, dto);
export const resendQuotationSimple = (id: number) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/resend-simple`);
export const sendQuotationToAgent = (id: number) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/send-to-agent`);
export const acceptQuotation = (id: number) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/accept`);

/** ===== Payments ===== */
export const listPayments = (page=0, size=20) =>
  api.get(`/api/payments?page=${page}&size=${size}`);
export const markPaymentPaid = (id: number, reference?: string) =>
  api.patch<PaymentDTO>(`/api/payments/${id}/mark-paid${reference ? `?reference=${encodeURIComponent(reference)}` : ""}`);

/** ===== Public form ===== */
export type PublicGroupRequest = {
  salutation: Salutation;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;

  fromAirport: string;
  toAirport: string;
  routing: RoutingType;

  departureDate: string;
  returnDate?: string;

  paxAdult: number;
  paxChild: number;
  paxInfant: number;

  groupType: GroupType;
  flightNumber?: string;
  specialRequest?: string;

  currency: string;
  posCode: string;
  category: RequestCategory;
  partnerId?: string;
};

export type PublicGroupRequestWithSegments = PublicGroupRequest & {
  segments: Segment[];
};

export const submitPublicGroupRequestWithSegments = (payload: PublicGroupRequestWithSegments) =>
  api.post<GroupRequestDTO>("/api/public/group-requests", payload);

// add to the top with others
export type Role = "GROUP_DESK" | "ROUTE_CONTROLLER" | "ADMIN";

// list users by role (for your selector)
export const listUsersByRole = (role: Role) =>
  api.get<{id: number; username: string; role: Role}[]>(`/api/admin/users?role=${encodeURIComponent(role)}`);

// change sendToRC to accept an assignee
export const sendGroupRequestToRC = (id: number, rcUsername: string) =>
  api.patch(`/api/group-requests/${id}/send-to-rc?assignedRc=${encodeURIComponent(rcUsername)}`);
