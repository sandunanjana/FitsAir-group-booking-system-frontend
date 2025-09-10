import AirportSelect from "./AirportSelect";
import type { Segment } from "@/api/endpoints";

const HUB = "CMB"; // FitsAir hub

export default function SegmentsBuilder({
    value,
    onChange,
}: {
    value: Segment[];
    onChange: (s: Segment[]) => void;
}): JSX.Element {

    function addBlank() {
        onChange([...value, { from: "", to: "", date: "", extras: {} }]);
    }
    function remove(i: number) {
        const copy = value.slice(); copy.splice(i, 1); onChange(copy);
    }
    function swap(i: number) {
        const copy = value.slice();
        const seg = copy[i];
        copy[i] = { ...seg, from: seg.to, to: seg.from };
        onChange(copy);
    }
    function update(i: number, seg: Partial<Segment>) {
        const copy = value.slice();
        copy[i] = { ...copy[i], ...seg };
        onChange(copy);
    }

    /** Auto-split non-HUB→non-HUB into from→CMB and CMB→to on blur */
    function autoSplit(i: number) {
        const seg = value[i];
        const from = (seg.from || "").toUpperCase();
        const to = (seg.to || "").toUpperCase();
        if (!from || !to || from === to) return;
        if (from !== HUB && to !== HUB) {
            const copy = value.slice();
            copy.splice(i, 1,
                { from, to: HUB, date: "", extras: {} },
                { from: HUB, to, date: "", extras: {} }
            );
            onChange(copy);
        }
    }

    return (
        <div className="space-y-3">
            {value.map((seg, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_180px_40px] items-start gap-3 border rounded-xl p-3">
                    <div>
                        <div className="text-sm text-gray-600">From</div>
                        <AirportSelect value={seg.from} onChange={(v) => update(i, { from: v })} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">To</div>
                        <AirportSelect value={seg.to} onChange={(v) => update(i, { to: v })} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Depart</div>
                        <input className="w-full border rounded px-3 py-2" type="date"
                            value={seg.date} onChange={e => update(i, { date: e.target.value })}
                            onBlur={() => autoSplit(i)} />
                    </div>
                    <div className="flex items-center justify-center">
                        <button type="button" title="Swap" onClick={() => swap(i)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center">⇄</button>
                    </div>

                    {/* per-leg extras */}
                    <div className="col-span-4 grid md:grid-cols-3 gap-3">
                        <div>
                            <div className="text-xs text-gray-500">Extra baggage (kg)</div>
                            <input className="w-full border rounded px-3 py-2" type="number" min={0}
                                value={seg.extras?.extraBaggageKg ?? ""}
                                onChange={(e) => update(i, { extras: { ...seg.extras, extraBaggageKg: Number(e.target.value) } })} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Meal preference</div>
                            <input className="w-full border rounded px-3 py-2" placeholder="VEG / NON / HALAL / …"
                                value={seg.extras?.meal ?? ""} onChange={(e) => update(i, { extras: { ...seg.extras, meal: e.target.value } })} />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Notes</div>
                            <input className="w-full border rounded px-3 py-2" placeholder="Wheelchair, sports gear…"
                                value={seg.extras?.notes ?? ""} onChange={(e) => update(i, { extras: { ...seg.extras, notes: e.target.value } })} />
                        </div>
                    </div>

                    <div className="col-span-4 flex justify-end">
                        <button type="button" className="text-red-700 text-sm" onClick={() => remove(i)}>Remove</button>
                    </div>
                </div>
            ))}

            <button type="button" className="bg-gray-900 text-white rounded px-3 py-2" onClick={addBlank}>
                + Add segment
            </button>
        </div>
    );
}
