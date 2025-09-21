// src/api/endpoints.ts
import { api } from "./client";

/* ========= Enums (align with backend) ========= */
export type BookingStatus =
  | "NEW"
  | "REVIEWING"
  | "QUOTED"
  | "CONFIRMED"
  | "TICKETED"
  | "CANCELLED";

export type RequestCategory = "DIRECT_CUSTOMER" | "GSA" | "CUSTOMER_CARE" | "AGENT";
export type QuotationStatus = "DRAFT" | "SENT" | "EXPIRED" | "ACCEPTED" | "REJECTED" | "RESENT";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE";
export type Salutation = "MR" | "MRS" | "MISS" | "MS" | "DR" | "PROF" | "OTHER";
export type RoutingType = "ONE_WAY" | "RETURN" | "MULTICITY";
export type GroupType = "EDUCATION" | "CONFERENCE" | "SPORTS" | "PILGRIMAGE" | "MICE" | "OTHER";

/* ========= Core DTOs ========= */
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

  requestDate: string; // yyyy-MM-dd
  category: RequestCategory;
  status?: BookingStatus;

  posCode: string;
  departureDate: string; // yyyy-MM-dd
  returnDate?: string;   // yyyy-MM-dd

  currency?: string;
  groupType?: GroupType;
  flightNumber?: string;
  specialRequest?: string;
  partnerId?: string;

  quotedFare: string | null;

  /** Assigned Route Controller username */
  assignedRcUsername?: string;
};

export type QuotationDTO = {
  id?: number;
  groupRequestId: number;
  totalFare: string;
  createdDate: string; // yyyy-MM-dd
  expiryDate: string;  // yyyy-MM-dd
  status?: QuotationStatus;
  approvedBy?: string | null;
  currency?: string;     // e.g., LKR
  note?: string | null;  // optional
};

export type PaymentDTO = {
  id?: number;
  groupRequestId: number;
  amount: string;
  dueDate: string; // yyyy-MM-dd
  status?: PaymentStatus;
  reference?: string | null;
};

/* ========= Segments (public itinerary legs) ========= */
export type Segment = {
  from: string;  // IATA
  to: string;    // IATA
  date: string;  // yyyy-MM-dd
  extras?: {
    extraBaggageKg?: number;
    meal?: string;
    notes?: string;
  };
};

/* ========= Dashboard ========= */
export type DashboardStatsDTO = {
  newRequestsSinceLogin: number;
  expiringQuotationsToday: number;
  confirmedGroupsWithPaymentsDueToday: number;
  quotationsForFollowUpToday: number;
};

/* ========= Admin users (for RC picker) ========= */
export type Role = "GROUP_DESK" | "ROUTE_CONTROLLER" | "ADMIN";
export const listUsersByRole = (role: Role) =>
  api.get<{ id: number; username: string; role: Role }[]>(
    `/api/admin/users?role=${encodeURIComponent(role)}`
  );

/* ========= Group Requests ========= */
export type GroupRequestDetails = {
  request: GroupRequestDTO;
  quotations: QuotationDTO[];
  payments: PaymentDTO[];
  segments: Segment[];
};

export const listGroupRequests = (page = 0, size = 20) =>
  api.get(`/api/group-requests?page=${page}&size=${size}`);

export const getGroupRequest = (id: number) =>
  api.get<GroupRequestDTO>(`/api/group-requests/${id}`);

export const getGroupRequestDetails = (id: number) =>
  api.get<GroupRequestDetails>(`/api/group-requests/${id}/details`);

export const createGroupRequest = (dto: GroupRequestDTO) =>
  api.post<GroupRequestDTO>("/api/group-requests", dto);

export const updateGroupRequest = (id: number, dto: GroupRequestDTO) =>
  api.put<GroupRequestDTO>(`/api/group-requests/${id}`, dto);

export const deleteGroupRequest = (id: number) =>
  api.delete(`/api/group-requests/${id}`);

/** Assign to RC + move to REVIEWING (uses `assignedRc` as per backend) */
export const sendGroupRequestToRC = (id: number, rcUsername: string) =>
  api.patch(`/api/group-requests/${id}/send-to-rc?assignedRc=${encodeURIComponent(rcUsername)}`);

export const markGroupRequestTicketed = (id: number) =>
  api.patch(`/api/group-requests/${id}/mark-ticketed`);

/* ========= Quotations ========= */
export const listQuotations = (page = 0, size = 20) =>
  api.get(`/api/quotations?page=${page}&size=${size}`);

export const getQuotation = (id: number) =>
  api.get<QuotationDTO>(`/api/quotations/${id}`);

export const createQuotation = (dto: QuotationDTO) =>
  api.post<QuotationDTO>("/api/quotations", dto);

export const updateQuoteStatus = (
  id: number,
  status: QuotationStatus,
  approvedBy?: string
) =>
  api.patch<QuotationDTO>(
    `/api/quotations/${id}/status?status=${status}${approvedBy ? `&approvedBy=${encodeURIComponent(approvedBy)}` : ""
    }`
  );

/** Full resend (old -> EXPIRED, create new DRAFT with new values you send) */
export const resendQuotation = (expiredId: number, dto: QuotationDTO) =>
  api.patch<QuotationDTO>(`/api/quotations/${expiredId}/resend`, dto);

/** One-click resend (old -> EXPIRED, create new DRAFT cloning previous total) */
export const resendQuotationSimple = (expiredId: number) =>
  api.patch<QuotationDTO>(`/api/quotations/${expiredId}/resend-simple`);

export const sendQuotationToAgent = (id: number, subject?: string) =>
  api.patch<QuotationDTO>(
    `/api/quotations/${id}/send-to-agent${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
  );


export const acceptQuotation = (id: number) =>
  api.patch<QuotationDTO>(`/api/quotations/${id}/accept`);

/* ========= Payments ========= */
export const listPayments = (page = 0, size = 20) =>
  api.get(`/api/payments?page=${page}&size=${size}`);

export const markPaymentPaid = (id: number, reference?: string) =>
  api.patch<PaymentDTO>(
    `/api/payments/${id}/mark-paid${reference ? `?reference=${encodeURIComponent(reference)}` : ""
    }`
  );

export type PaymentAttachmentDTO = {
  id: number;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

/* ========= Public Form ========= */
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

export const submitPublicGroupRequestWithSegments = (
  payload: PublicGroupRequestWithSegments
) => api.post<GroupRequestDTO>("/api/public/group-requests", payload);

export const listPaymentAttachments = (paymentId: number) =>
  api.get<PaymentAttachmentDTO[]>(`/api/payments/${paymentId}/attachments`);

export const uploadPaymentAttachment = (paymentId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  // IMPORTANT: do not set Content-Type manually; axios adds boundary.
  return api.post<PaymentAttachmentDTO>(`/api/payments/${paymentId}/attachments`, form);
};

export const downloadPaymentAttachment = (attachmentId: number) =>
  api.get<ArrayBuffer>(`/api/payments/attachments/${attachmentId}/download`, {
    responseType: "arraybuffer",
  });

export const sendPNRToAgent = (groupId: number, pnr: string) =>
  api.patch<GroupRequestDTO>(`/api/group-requests/${groupId}/pnr`, { pnr });

export const updateSegmentDate = (
  groupRequestId: number,
  segmentIndex1Based: number,
  newDate: string
) =>
  api.patch(
    `/api/group-requests/${groupRequestId}/segments/${segmentIndex1Based}/date?date=${encodeURIComponent(newDate)}`
  );

export const updateSegmentExtras = (
  groupId: number,
  segmentIndex: number,
  payload: { proposedDate?: string; proposedTime?: string; offeredBaggageKg?: number; note?: string; }
) =>
  api.patch(
    `/api/group-requests/${groupId}/segments/${segmentIndex}/extras`,
    payload
  );

export const notifySegmentChangesToAgent = (groupId: number) =>
  api.post(`/api/group-requests/${groupId}/segments/notify-agent`, {});