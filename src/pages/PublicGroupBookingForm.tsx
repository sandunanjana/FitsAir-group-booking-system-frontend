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
import "@/styles/public-form.css"; // <-- add this import
import PosSelect from "@/components/PosSelect";
import { normalizePos } from "@/data/pos";

const HUB = "CMB";
const salutations: Salutation[] = ["MR", "MRS", "MISS", "MS", "DR", "PROF", "OTHER"];
const categories: RequestCategory[] = ["NORMAL", "GSA", "CUSTOMER_CARE", "AGENT"];
const groupTypes: GroupType[] = ["EDUCATION", "CONFERENCE", "SPORTS", "PILGRIMAGE", "MICE", "OTHER"];

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
        category: "NORMAL",
        partnerId: "",
    });

    const [segments, setSegments] = useState<Segment[]>([{ from: "", to: "", date: "", extras: {} }]);
    const [activeSection, setActiveSection] = useState<"contact" | "trip" | "passengers" | "other">("contact");
    const [submitted, setSubmitted] = useState(false);
    const [err, setErr] = useState("");

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
        // keep any dates/extras already typed
        return plan.map((s, i) => ({ ...s, date: old[i]?.date ?? "", extras: old[i]?.extras ?? {} }));
    }

    useEffect(() => {
        setSegments((old) => replan(form.fromAirport, form.toAirport, form.routing, old));
    }, [form.fromAirport, form.toAirport, form.routing]);

    function setF<K extends keyof PublicGroupRequest>(key: K, val: PublicGroupRequest[K]) {
        setForm((p) => ({ ...p, [key]: val }));
    }

    const totalPax = () => (form.paxAdult || 0) + (form.paxChild || 0) + (form.paxInfant || 0);
    const routingForPayload: RoutingType = isForcedMultiCity ? "MULTICITY" : form.routing;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");

        if (!form.firstName || !form.lastName) return setErr("Please enter your name.");
        if (totalPax() < 1) return setErr("Total passengers must be at least 1.");
        if (!form.fromAirport || !form.toAirport) return setErr("Please select origin and destination.");
        if ((form.category === "GSA" || form.category === "CUSTOMER_CARE") && !form.partnerId)
            return setErr("Please enter the Partner / Customer Care ID.");
        if (segments.some((s) => !s.date)) return setErr("Please set a date for each segment.");

        const departureDate = segments[0]?.date || "";
        const returnDate = form.routing === "RETURN" ? segments.at(-1)?.date || "" : undefined;

        const payload: PublicGroupRequestWithSegments = {
            ...form,
            fromAirport: form.fromAirport.toUpperCase(),
            toAirport: form.toAirport.toUpperCase(),
            routing: routingForPayload,
            departureDate,
            returnDate,
            currency: form.currency.toUpperCase(),
            posCode: normalizePos(form.posCode), // <-- normalize here
            segments,
        };

        try {
            await submitPublicGroupRequestWithSegments(payload);
            setSubmitted(true);
        } catch {
            setErr("Sorry, we couldn't submit your request. Please try again.");
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Group Booking Request</h1>
                            <p className="text-blue-100 mt-2">Get the best rates for your group travel</p>
                        </div>
                        <div className="bg-blue-500/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 self-start">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Secure & Encrypted
                        </div>
                    </div>
                </div>

                {/* Progress Navigation */}
                <div className="border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {sections.map((section, index) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => setActiveSection(section.id)}
                                className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${activeSection === section.id
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeSection === section.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                                            }`}
                                    >
                                        {index + 1}
                                    </div>
                                    <span className="hidden sm:inline">{section.title}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-8">
                    {/* Contact */}
                    {activeSection === "contact" && (
                        <Section title="Contact Information" description="Tell us how we can reach you">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Field label="Title" required>
                                    <select className="input-select" value={form.salutation} onChange={(e) => setF("salutation", e.target.value as Salutation)}>
                                        {salutations.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="First name" required>
                                    <input className="input" value={form.firstName} onChange={(e) => setF("firstName", e.target.value)} placeholder="Enter your first name" />
                                </Field>
                                <Field label="Last name" required>
                                    <input className="input" value={form.lastName} onChange={(e) => setF("lastName", e.target.value)} placeholder="Enter your last name" />
                                </Field>
                                <Field label="Email" required>
                                    <input className="input" type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} placeholder="your.email@example.com" />
                                </Field>
                                <Field label="Contact number" required>
                                    <input className="input" value={form.contactNumber} onChange={(e) => setF("contactNumber", e.target.value)} placeholder="+94 77 123 4567" />
                                </Field>
                                <Field label="Category">
                                    <select className="input-select" value={form.category} onChange={(e) => setF("category", e.target.value as RequestCategory)}>
                                        {categories.map((x) => (
                                            <option key={x} value={x}>
                                                {x.replace("_", " ")}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                {(form.category === "GSA" || form.category === "CUSTOMER_CARE") && (
                                    <Field label="Partner / Customer Care ID" required>
                                        <input className="input" value={form.partnerId ?? ""} onChange={(e) => setF("partnerId", e.target.value)} placeholder="Enter your partner ID" />
                                    </Field>
                                )}
                                <Field label="POS Country" required>
                                    <PosSelect
                                        value={form.posCode}
                                        onChange={(v) => setF("posCode", v)}
                                        category={form.category}   // <-- tells the dropdown when to lock
                                    />
                                </Field>
                            </div>
                        </Section>
                    )}
                    {/* Trip */}
                    {activeSection === "trip" && (
                        <Section title="Trip Details" description="Where and when are you traveling?">
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Field label="From Airport" required>
                                        <AirportSelect value={form.fromAirport} onChange={(v) => setF("fromAirport", v)} placeholder="Select origin (e.g., CMB)" />
                                    </Field>
                                    <Field label="To Airport" required>
                                        <AirportSelect value={form.toAirport} onChange={(v) => setF("toAirport", v)} placeholder="Select destination (e.g., KUL)" />
                                    </Field>
                                    <Field label="Trip Type">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className={`btn-tab ${form.routing === "ONE_WAY" ? "btn-tab-active" : ""}`}
                                                onClick={() => setF("routing", "ONE_WAY")}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                </svg>
                                                One Way
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn-tab ${form.routing === "RETURN" ? "btn-tab-active" : ""}`}
                                                onClick={() => setF("routing", "RETURN")}
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
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="font-medium text-blue-900">Multi-City Routing</p>
                                            <p className="text-blue-700 text-sm mt-1">
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
                    )}

                    {/* Passengers */}
                    {activeSection === "passengers" && (
                        <Section title="Passengers & Group" description="Tell us about your group">
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                                    <Field label="Adults">
                                        <input className="input-number" type="number" min={0} value={form.paxAdult} onChange={(e) => setF("paxAdult", Number(e.target.value))} />
                                    </Field>
                                    <Field label="Children">
                                        <input className="input-number" type="number" min={0} value={form.paxChild} onChange={(e) => setF("paxChild", Number(e.target.value))} />
                                    </Field>
                                    <Field label="Infants">
                                        <input className="input-number" type="number" min={0} value={form.paxInfant} onChange={(e) => setF("paxInfant", Number(e.target.value))} />
                                    </Field>
                                    <Field label="Total">
                                        <div className="h-12 flex items-center justify-center px-4 border border-gray-300 rounded-xl bg-gray-50 font-semibold text-lg">{totalPax()}</div>
                                    </Field>
                                    <Field label="Group Type">
                                        <select className="input-select" value={form.groupType} onChange={(e) => setF("groupType", e.target.value as GroupType)}>
                                            {groupTypes.map((x) => (
                                                <option key={x} value={x}>
                                                    {x.replace("_", " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                </div>

                                <Field label="Special Requests">
                                    <textarea
                                        className="textarea"
                                        rows={3}
                                        value={form.specialRequest ?? ""}
                                        onChange={(e) => setF("specialRequest", e.target.value)}
                                        placeholder="Meal preferences, baggage requirements, accessibility needs, etc."
                                    />
                                </Field>

                            </div>
                        </Section>
                    )}

                    {/* Other */}
                    {activeSection === "other" && (
                        <Section title="Additional Information" description="Final details for your booking">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Field label="Currency">
                                    <input className="input uppercase" value={form.currency} onChange={(e) => setF("currency", e.target.value)} placeholder="LKR" />
                                </Field>
                                <Field label="Flight Number (Optional)">
                                    <input className="input" value={form.flightNumber ?? ""} onChange={(e) => setF("flightNumber", e.target.value)} placeholder="UL 123" />
                                </Field>
                            </div>
                        </Section>
                    )}

                    {err && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-red-700 font-medium flex items-center gap-2">
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
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-3 h-3 rounded-full ${activeSection === section.id ? "bg-blue-600" : "bg-gray-300"}`}
                                    aria-label={`Go to ${section.title}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3">
                            {activeSection !== "contact" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const i = sections.findIndex((s) => s.id === activeSection);
                                        setActiveSection(sections[i - 1]?.id ?? "contact");
                                    }}
                                    className="btn-secondary"
                                >
                                    Previous
                                </button>
                            )}

                            {activeSection !== "other" ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const i = sections.findIndex((s) => s.id === activeSection);
                                        setActiveSection(sections[i + 1]?.id ?? "other");
                                    }}
                                    className="btn-primary"
                                >
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <div className="flex items-center gap-1 mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {required && <span className="text-red-500">*</span>}
            </div>
            {children}
        </label>
    );
}

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
    return (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Segment {index + 1}</span>
                {totalSegments > 1 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        {seg.from} → {seg.to}
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <div className="field-label">Departure Date</div>
                    <input
                        className="input"
                        type="date"
                        value={seg.date}
                        onChange={(e) => onChange({ ...seg, date: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                    />
                </div>
                <div>
                    <div className="field-label">Extra Baggage (kg)</div>
                    <input
                        className="input"
                        type="number"
                        min={0}
                        value={seg.extras?.extraBaggageKg ?? ""}
                        placeholder="0"
                        onChange={(e) => onChange({ ...seg, extras: { ...seg.extras, extraBaggageKg: Number(e.target.value) } })}
                    />
                </div>
                <div className="lg:col-span-3">
                    <div className="field-label">Special Requirements</div>
                    <input
                        className="input"
                        placeholder="Vegetarian meals, wheelchair assistance, etc."
                        value={[seg.extras?.meal, seg.extras?.notes].filter(Boolean).join(" · ")}
                        onChange={(e) => {
                            const [meal, ...rest] = e.target.value.split("·").map((s) => s.trim());
                            onChange({ ...seg, extras: { ...seg.extras, meal, notes: rest.join(" · ") } });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function Success(): JSX.Element {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully! 🎉</h2>
                <p className="text-gray-600 mb-6">
                    We've received your group booking request. Our dedicated team will contact you within 24 hours with a customized quotation.
                </p>

                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-700">
                        <strong>Next steps:</strong> Check your email for a confirmation and keep your phone handy for our call.
                    </p>
                </div>

                <a href="/" className="btn-primary w-full text-center">
                    Back to Homepage
                </a>
            </div>
        </div>
    );
}
