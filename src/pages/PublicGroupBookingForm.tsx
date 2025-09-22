import { useEffect, useMemo, useState } from "react";
import AirportSelect from "@/components/AirportSelect";
import {
    submitPublicGroupRequestWithSegments,
    type PublicGroupRequest,
    type PublicGroupRequestWithSegments,
    type RequestCategory,
    type RoutingType,
    type GroupType,
    type Salutation,
    type Segment,
} from "@/api/endpoints";
import "@/styles/public-form.css";
import PosSelect from "@/components/PosSelect";
import { normalizePos } from "@/data/pos";

/* ---------- Constants ---------- */
const HUB = "CMB";
const salutations: Salutation[] = ["MR", "MRS", "MISS", "MS", "DR", "PROF", "OTHER"];
// Aligned with backend enum
const categories: RequestCategory[] = ["DIRECT_CUSTOMER", "GSA", "CUSTOMER_CARE", "AGENT"];
const groupTypes: GroupType[] = ["EDUCATION", "CONFERENCE", "SPORTS", "PILGRIMAGE", "MICE", "OTHER"];

/* ---------- Lightweight Popup ---------- */
function Popup({
    open,
    message,
    onClose,
}: {
    open: boolean;
    message: string;
    onClose: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
                <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#001B71] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                    <div className="text-gray-800">{message}</div>
                </div>
                <div className="mt-6 text-right">
                    <button className="btn-primary" onClick={onClose}>OK</button>
                </div>
            </div>
        </div>
    );
}

/* ---------- Main Form ---------- */
export default function PublicGroupBookingForm(): JSX.Element {
    const [form, setForm] = useState<PublicGroupRequest>({
        salutation: "MR",
        firstName: "",
        lastName: "",
        email: "",
        contactNumber: "",
        fromAirport: "",
        toAirport: "",
        routing: "ONE_WAY",
        departureDate: "",
        returnDate: "",
        paxAdult: 1,
        paxChild: 0,
        paxInfant: 0,
        groupType: "EDUCATION",
        flightNumber: "",
        specialRequest: "",
        currency: "LKR",
        posCode: "LK",
        category: "DIRECT_CUSTOMER", // aligned with backend
        partnerId: "",
    });

    const [segments, setSegments] = useState<Segment[]>([{ from: "", to: "", date: "", extras: {} }]);
    const [activeSection, setActiveSection] = useState<"contact" | "trip" | "passengers" | "other">("contact");
    const [submitted, setSubmitted] = useState(false);
    const [err, setErr] = useState("");

    // popup state
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupMsg, setPopupMsg] = useState("");

    const isForcedMultiCity = useMemo(
        () =>
            !!form.fromAirport &&
            !!form.toAirport &&
            form.fromAirport.toUpperCase() !== HUB &&
            form.toAirport.toUpperCase() !== HUB,
        [form.fromAirport, form.toAirport]
    );

    function replan(from: string, to: string, routing: RoutingType, old: Segment[]): Segment[] {
        const F = from?.toUpperCase() || "";
        const T = to?.toUpperCase() || "";
        if (!F || !T || F === T) return [{ from: F, to: T, date: "", extras: {} }];

        const plan: Segment[] = [];
        if (routing === "ONE_WAY") {
            if (F === HUB || T === HUB) plan.push({ from: F, to: T, date: "", extras: {} });
            else plan.push({ from: F, to: HUB, date: "", extras: {} }, { from: HUB, to: T, date: "", extras: {} });
        } else {
            if (F === HUB || T === HUB)
                plan.push({ from: F, to: T, date: "", extras: {} }, { from: T, to: F, date: "", extras: {} });
            else
                plan.push(
                    { from: F, to: HUB, date: "", extras: {} },
                    { from: HUB, to: T, date: "", extras: {} },
                    { from: T, to: HUB, date: "", extras: {} },
                    { from: HUB, to: F, date: "", extras: {} }
                );
        }
        return plan.map((s, i) => ({ ...s, date: old[i]?.date ?? "", extras: old[i]?.extras ?? {} }));
    }

    useEffect(() => {
        setSegments((old) => replan(form.fromAirport, form.toAirport, form.routing, old));
    }, [form.fromAirport, form.toAirport, form.routing]);

    function setF<K extends keyof PublicGroupRequest>(key: K, val: PublicGroupRequest[K]) {
        setForm((p) => ({ ...p, [key]: val }));
    }

    // Passengers logic
    const totalGroup = () => (form.paxAdult || 0) + (form.paxChild || 0); // Adults + Children only
    const routingForPayload: RoutingType = isForcedMultiCity ? "MULTICITY" : form.routing;

    const passengerRulesOk = () => {
        if (totalGroup() < 10) return false;          // must be ≥ 10 (Adults + Children)
        if ((form.paxInfant || 0) > 4) return false;  // infants ≤ 4
        return true;
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");

        if (!form.firstName || !form.lastName) return setErr("Please enter your name.");
        if (!passengerRulesOk()) {
            if (totalGroup() < 10) return setErr("Minimum group size is 10 (Adults + Children).");
            if (form.paxInfant > 4) return setErr("Maximum 4 infants are allowed.");
        }
        if (!form.fromAirport || !form.toAirport) return setErr("Please select origin and destination.");
        if ((form.category === "GSA" || form.category === "CUSTOMER_CARE" || form.category === "AGENT") && !form.partnerId)
            return setErr("Please enter the Partner / Customer Care ID.");
        if (segments.some((s) => !s.date)) return setErr("Please set a date for each segment.");

        const departureDate = segments[0]?.date || "";
        if (form.routing === "RETURN" && segments.length < 2) {
            return setErr("Return trip requires at least two segments.");
        }
        const returnDate = form.routing === "RETURN" ? segments.at(-1)?.date || "" : undefined;

        const payload: PublicGroupRequestWithSegments = {
            ...form,
            fromAirport: form.fromAirport.toUpperCase(),
            toAirport: form.toAirport.toUpperCase(),
            routing: routingForPayload,
            departureDate,
            returnDate,
            currency: form.currency.toUpperCase(),
            posCode: normalizePos(form.posCode),
            segments,
        };

        try {
            await submitPublicGroupRequestWithSegments(payload);
            setSubmitted(true);
        } catch {
            setErr("Sorry, we couldn't submit your request. Please try again.");
        }
    }

    function handleNext(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();

        // Show popup on Passengers step if total (Adults + Children) < 10
        if (activeSection === "passengers" && totalGroup() < 10) {
            setPopupMsg("Minimum group size is 10 (Adults + Children).");
            setPopupOpen(true);
            return;
        }

        const i = sections.findIndex((s) => s.id === activeSection);
        setActiveSection(sections[i + 1]?.id ?? "other");
    }

    function handlePrev(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        const i = sections.findIndex((s) => s.id === activeSection);
        setActiveSection(sections[i - 1]?.id ?? "contact");
    }

    // ---- NEW: Tab navigation guards ----
    function canGoForward(target: typeof activeSection): boolean {
        // If trying to go to "other" (after passengers), enforce group size rule
        if (target === "other" && totalGroup() < 10) {
            setPopupMsg("Minimum group size is 10 (Adults + Children).");
            setPopupOpen(true);
            return false;
        }
        return true;
    }

    function handleTabClick(target: typeof activeSection) {
        const order = ["contact", "trip", "passengers", "other"] as const;
        const curIdx = order.indexOf(activeSection);
        const nextIdx = order.indexOf(target);

        // Always allow going backwards or to same tab
        if (nextIdx <= curIdx) {
            setActiveSection(target);
            return;
        }

        // Moving forward — gate it
        if (canGoForward(target)) {
            setActiveSection(target);
        }
    }

    if (submitted) return <Success />;

    const sections = [
        { id: "contact", title: "Contact Information" },
        { id: "trip", title: "Trip Details" },
        { id: "passengers", title: "Passengers & Group" },
        { id: "other", title: "Additional Information" },
    ] as const;

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="header-gradient text-white p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Group Booking Request</h1>
                            <p className="text-blue-100 mt-2">Get the best rates for your group travel</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 self-start">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Secure & Encrypted
                        </div>
                    </div>
                </div>

                {/* Progress Navigation (clickable) */}
                <div className="border-b border-gray-200">
                    <nav className="flex overflow-x-auto" role="tablist" aria-label="Booking steps">
                        {sections.map((section, index) => {
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`panel-${section.id}`}
                                    onClick={() => handleTabClick(section.id)}
                                    className={`flex-1 min-w-[160px] px-4 py-3 text-sm font-medium transition-colors ${isActive ? "text-[#001B71] border-b-2 border-[#001B71] bg-[#001B71]/10" : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 justify-center">
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-[#001B71] text-white" : "bg-gray-200 text-gray-600"
                                                }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <span className="hidden sm:inline">{section.title}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <form
                    onSubmit={onSubmit}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && activeSection !== "other") {
                            e.preventDefault(); // block submit on earlier steps
                        }
                    }}
                    className="p-6 md:p-8 space-y-8"
                >
                    {/* Contact */}
                    {activeSection === "contact" && (
                        <div id="panel-contact" role="tabpanel" aria-labelledby="tab-contact">
                            <Section title="Contact Information" description="Tell us how we can reach you">
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Field label="Title" required htmlFor="salutation">
                                        <select
                                            id="salutation"
                                            className="input-select"
                                            value={form.salutation}
                                            onChange={(e) => setF("salutation", e.target.value as Salutation)}
                                        >
                                            {salutations.map((x) => (
                                                <option key={x} value={x}>
                                                    {x}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="First name" required htmlFor="firstName">
                                        <input
                                            id="firstName"
                                            className="input"
                                            value={form.firstName}
                                            onChange={(e) => setF("firstName", e.target.value)}
                                            placeholder="Enter your first name"
                                        />
                                    </Field>

                                    <Field label="Last name" required htmlFor="lastName">
                                        <input
                                            id="lastName"
                                            className="input"
                                            value={form.lastName}
                                            onChange={(e) => setF("lastName", e.target.value)}
                                            placeholder="Enter your last name"
                                        />
                                    </Field>

                                    <Field label="Email" required htmlFor="email">
                                        <input
                                            id="email"
                                            className="input"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setF("email", e.target.value)}
                                            placeholder="your.email@example.com"
                                        />
                                    </Field>

                                    <Field label="Contact number" required htmlFor="contactNumber">
                                        <input
                                            id="contactNumber"
                                            className="input"
                                            value={form.contactNumber}
                                            onChange={(e) => setF("contactNumber", e.target.value)}
                                            placeholder="+94 77 123 4567"
                                        />
                                    </Field>

                                    <Field label="Category" htmlFor="category">
                                        <select
                                            id="category"
                                            className="input-select"
                                            value={form.category}
                                            onChange={(e) => setF("category", e.target.value as RequestCategory)}
                                        >
                                            {categories.map((x) => (
                                                <option key={x} value={x}>
                                                    {x.replace("_", " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    {(form.category === "GSA" || form.category === "CUSTOMER_CARE" || form.category === "AGENT") && (
                                        <Field label="Partner / Customer Care ID" required htmlFor="partnerId">
                                            <input
                                                id="partnerId"
                                                className="input"
                                                value={form.partnerId ?? ""}
                                                onChange={(e) => setF("partnerId", e.target.value)}
                                                placeholder="Enter your partner or customer care ID"
                                            />
                                        </Field>
                                    )}

                                    <Field label="POS Country" required htmlFor="posCode">
                                        <PosSelect value={form.posCode} onChange={(v) => setF("posCode", v)} category={form.category} />
                                    </Field>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* Trip */}
                    {activeSection === "trip" && (
                        <div id="panel-trip" role="tabpanel" aria-labelledby="tab-trip">
                            <Section title="Trip Details" description="Where and when are you traveling?">
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Field label="From Airport" required htmlFor="fromAirport">
                                            <AirportSelect
                                                value={form.fromAirport}
                                                onChange={(v) => {
                                                    setF("fromAirport", v);
                                                    if (v && form.toAirport && v.toUpperCase() === form.toAirport.toUpperCase()) {
                                                        setF("toAirport", "");
                                                    }
                                                }}
                                                placeholder="Select origin (e.g., CMB)"
                                            />
                                        </Field>

                                        <Field label="To Airport" required htmlFor="toAirport">
                                            <AirportSelect
                                                value={form.toAirport}
                                                onChange={(v) => {
                                                    if (v && form.fromAirport && v.toUpperCase() === form.fromAirport.toUpperCase()) {
                                                        setPopupMsg("Destination cannot be the same as origin.");
                                                        setPopupOpen(true);
                                                        return;
                                                    }
                                                    setF("toAirport", v);
                                                }}
                                                placeholder="Select destination (e.g., KUL)"
                                            />
                                        </Field>

                                        <Field label="Trip Type" htmlFor="routing">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    className={`btn-tab ${form.routing === "ONE_WAY" ? "btn-tab-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setF("routing", "ONE_WAY");
                                                    }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                    One Way
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn-tab ${form.routing === "RETURN" ? "btn-tab-active" : ""}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setF("routing", "RETURN");
                                                    }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Return
                                                </button>
                                            </div>
                                        </Field>
                                    </div>

                                    {isForcedMultiCity && (
                                        <div className="bg-[#001B71]/5 border border-[#001B71]/20 rounded-xl p-4 flex items-start gap-3">
                                            <svg className="w-5 h-5 text-[#001B71] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="font-medium text-[#001B71]">Multi-City Routing</p>
                                                <p className="text-[#001B71] text-sm/6 mt-1 opacity-80">
                                                    You've selected a route that requires connecting through {HUB}. We'll automatically plan your journey with the optimal connections.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900">Flight Segments</h4>
                                        {segments.map((seg, i) => (
                                            <SegmentRow
                                                key={`${seg.from}-${seg.to}-${i}`}
                                                seg={seg}
                                                index={i}
                                                totalSegments={segments.length}
                                                onChange={(s) => {
                                                    const copy = segments.slice();
                                                    copy[i] = s;
                                                    setSegments(copy);
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* Passengers */}
                    {activeSection === "passengers" && (
                        <div id="panel-passengers" role="tabpanel" aria-labelledby="tab-passengers">
                            <Section title="Passengers & Group" description="Tell us about your group">
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                                        <Field label="Adults" htmlFor="paxAdult">
                                            <input
                                                id="paxAdult"
                                                className="input-number"
                                                type="number"
                                                min={0}
                                                value={form.paxAdult}
                                                onChange={(e) => setF("paxAdult", Number(e.target.value))}
                                            />
                                        </Field>
                                        <Field label="Children" htmlFor="paxChild">
                                            <input
                                                id="paxChild"
                                                className="input-number"
                                                type="number"
                                                min={0}
                                                value={form.paxChild}
                                                onChange={(e) => setF("paxChild", Number(e.target.value))}
                                            />
                                        </Field>
                                        <Field label="Infants (max 4)" htmlFor="paxInfant">
                                            <input
                                                id="paxInfant"
                                                className="input-number"
                                                type="number"
                                                min={0}
                                                max={4}
                                                value={form.paxInfant}
                                                onChange={(e) =>
                                                    setF("paxInfant", Math.min(4, Math.max(0, Number(e.target.value))))
                                                }
                                            />
                                        </Field>
                                        <Field label="Total (Adults + Children)" htmlFor="totalPax">
                                            <div
                                                id="totalPax"
                                                className="h-12 flex items-center justify-center px-4 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-lg"
                                            >
                                                {totalGroup()}
                                            </div>
                                        </Field>
                                        <Field label="Group Type" htmlFor="groupType">
                                            <select
                                                id="groupType"
                                                className="input-select"
                                                value={form.groupType}
                                                onChange={(e) => setF("groupType", e.target.value as GroupType)}
                                            >
                                                {groupTypes.map((x) => (
                                                    <option key={x} value={x}>
                                                        {x.replace("_", " ")}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    <Field label="Special Requests" htmlFor="specialRequest">
                                        <textarea
                                            id="specialRequest"
                                            className="textarea"
                                            rows={3}
                                            value={form.specialRequest ?? ""}
                                            onChange={(e) => setF("specialRequest", e.target.value)}
                                            placeholder="Meal preferences, baggage requirements, accessibility needs, etc."
                                        />
                                    </Field>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* Other */}
                    {activeSection === "other" && (
                        <div id="panel-other" role="tabpanel" aria-labelledby="tab-other">
                            <Section title="Additional Information" description="Final details for your booking">
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Field label="Currency" htmlFor="currency">
                                        <input
                                            id="currency"
                                            className="input uppercase"
                                            value={form.currency}
                                            onChange={(e) => setF("currency", e.target.value)}
                                            placeholder="LKR"
                                        />
                                    </Field>
                                    <Field label="Flight Number (Optional)" htmlFor="flightNumber">
                                        <input
                                            id="flightNumber"
                                            className="input"
                                            value={form.flightNumber ?? ""}
                                            onChange={(e) => setF("flightNumber", e.target.value)}
                                            placeholder="8D 123"
                                        />
                                    </Field>
                                </div>
                            </Section>
                        </div>
                    )}

                    {err && (
                        <div className="bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-700 font-medium flex items-center gap-2 p-4">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {err}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-200">
                        <div className="flex gap-3">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => handleTabClick(section.id)}
                                    className={`step-dot ${activeSection === section.id ? "step-dot--active" : ""}`}
                                    aria-label={`Go to ${section.title}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3">
                            {activeSection !== "contact" && (
                                <button type="button" onClick={handlePrev} className="btn-secondary">
                                    Previous
                                </button>
                            )}

                            {activeSection !== "other" ? (
                                <button type="button" onClick={handleNext} className="btn-primary">
                                    Next
                                </button>
                            ) : (
                                <button type="submit" className="btn-primary">
                                    Submit Request
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Popup */}
            <Popup open={popupOpen} message={popupMsg} onClose={() => setPopupOpen(false)} />
        </div>
    );
}

/* ---------- Small UI helpers ---------- */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                {description && <p className="text-gray-600 mt-1">{description}</p>}
            </div>
            {children}
        </section>
    );
}

function Field({
    label,
    required,
    children,
    htmlFor,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <div className="block">
            <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700" htmlFor={htmlFor}>
                    {label}
                </label>
                {required && <span className="text-red-500">*</span>}
            </div>
            {children}
        </div>
    );
}

/* ---------- Segment Row with Multi-Select Requirements ---------- */
function SegmentRow({
    seg,
    index,
    totalSegments,
    onChange,
}: {
    seg: Segment;
    index: number;
    totalSegments: number;
    onChange: (s: Segment) => void;
}) {
    const baggageOptions = [0, 10, 20, 25, 30, 40];

    // Multiselect options
    const SPECIAL_OPTIONS = [
        { key: "MEALS", label: "Meals" },
        { key: "WHEELCHAIR_RAMP", label: "Wheelchair for ramp" },
        { key: "SERVICE_HUB", label: "Service hub" },
        { key: "FITSAIR_SHIELD", label: "FitsAir Shield (travel insurance)" },
    ] as const;

    // Open/close state for dropdown
    const [reqOpen, setReqOpen] = useState(false);
    const selectedReqs: string[] = seg.extras?.specialRequirements ?? [];

    function toggleReq(key: string) {
        const has = selectedReqs.includes(key);
        const next = has ? selectedReqs.filter((k) => k !== key) : [...selectedReqs, key];
        onChange({ ...seg, extras: { ...seg.extras, specialRequirements: next } });
    }

    return (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                    </div>
                    <span className="text-lg font-semibold text-gray-800">Flight Segment</span>
                </div>
                {totalSegments > 1 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        {seg.from} → {seg.to}
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">
                {/* Date */}
                <div>
                    <div className="field-label mb-2 font-medium text-gray-700">Departure Date</div>
                    <div className="relative">
                        <input
                            className="input bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200 rounded-xl py-3 px-4"
                            type="date"
                            value={seg.date}
                            onChange={(e) => onChange({ ...seg, date: e.target.value })}
                            min={new Date().toISOString().split("T")[0]}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="field-label mb-2 font-medium text-gray-700">Baggage (kg)</div>
                    <div className="relative">
                        <select
                            className="input-select bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200 appearance-none rounded-xl py-3 px-4 pr-10"
                            value={seg.extras?.extraBaggageKg ?? 0}
                            onChange={(e) =>
                                onChange({
                                    ...seg,
                                    extras: { ...seg.extras, extraBaggageKg: Number(e.target.value) },
                                })
                            }
                        >
                            {baggageOptions.map((kg) => (
                                <option key={kg} value={kg}>
                                    {kg === 0 ? "No extra" : `${kg} kg`}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Special requirements multiselect */}
                <div className="lg:col-span-3">
                    <div className="field-label mb-2 font-medium text-gray-700">Special Requirements</div>

                    {/* Trigger */}
                    <div className="relative">
                        <button
                            type="button"
                            className="input flex items-center justify-between bg-white border-gray-300 hover:border-blue-400 transition-colors duration-200 rounded-xl py-3 px-4"
                            onClick={() => setReqOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={reqOpen}
                        >
                            <span className="flex flex-wrap gap-2 text-left">
                                {selectedReqs.length === 0 ? (
                                    <span className="text-gray-500">Select requirements</span>
                                ) : (
                                    selectedReqs.map((key) => {
                                        const label = SPECIAL_OPTIONS.find((o) => o.key === key)?.label ?? key;
                                        return (
                                            <span
                                                key={key}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium transition-colors hover:bg-blue-200"
                                            >
                                                {label}
                                                <svg
                                                    className="w-3.5 h-3.5 cursor-pointer ml-1"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleReq(key);
                                                    }}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </span>
                                        );
                                    })
                                )}
                            </span>
                            <svg className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${reqOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {reqOpen && (
                            <div
                                className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                                role="listbox"
                                aria-label="Special Requirements"
                            >
                                <div className="max-h-60 overflow-y-auto py-2">
                                    {SPECIAL_OPTIONS.map((opt) => {
                                        const checked = selectedReqs.includes(opt.key);
                                        return (
                                            <label
                                                key={opt.key}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                                            >
                                                <div className="flex items-center justify-center h-5 w-5 rounded border-gray-300 bg-white border">
                                                    <input
                                                        type="checkbox"
                                                        className="opacity-0 absolute h-5 w-5"
                                                        checked={checked}
                                                        onChange={() => toggleReq(opt.key)}
                                                    />
                                                    {checked && (
                                                        <svg className="h-3.5 w-3.5 text-blue-600 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-800">{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end">
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 px-4 py-1.5 rounded-md hover:bg-blue-100 transition-colors duration-150"
                                        onClick={() => setReqOpen(false)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Optional: free-text notes under the multiselect */}
                    <div className="mt-4">
                        <div className="field-label mb-2 font-medium text-gray-700">Additional Notes</div>
                        <input
                            className="input bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200 rounded-xl py-3 px-4"
                            placeholder="E.g. vegetarian meals for 5 pax, aisle seating, etc."
                            value={seg.extras?.notes ?? ""}
                            onChange={(e) => onChange({ ...seg, extras: { ...seg.extras, notes: e.target.value } })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- Success Page ---------- */
function Success(): JSX.Element {
    return (
        <div className="min-h-screen page-gradient flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-[#EA0029]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-[#EA0029]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully! 🎉</h2>
                <p className="text-gray-600 mb-6">
                    We've received your group booking request. Our dedicated team will contact you within 24 hours with a
                    customized quotation.
                </p>

                <a href="/" className="btn-primary w-full text-center">
                    Back to Homepage
                </a>
            </div>
        </div>
    );
}
