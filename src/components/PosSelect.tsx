import { useEffect } from "react";
import { POS_LIST } from "@/data/pos";
import type { RequestCategory } from "@/api/endpoints";

export default function PosSelect({
    value,
    onChange,
    category,
    placeholder = "Select POS (e.g., LK)",
}: {
    value: string;
    onChange: (code: string) => void;
    category?: RequestCategory;
    placeholder?: string;
}): JSX.Element {
    const isCustomerCare = category === "CUSTOMER_CARE";

    // Auto-lock POS to LK-CC for Customer Care
    useEffect(() => {
        if (isCustomerCare && value !== "LK-CC") onChange("LK-CC");
    }, [isCustomerCare, value, onChange]);

    return (
        <div>
            <select
                className="input-select"
                value={isCustomerCare ? "LK-CC" : value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isCustomerCare}
            >
                {!value && !isCustomerCare && <option value="">{placeholder}</option>}

                {/* Show LK-CC first if locked, otherwise show the regular countries list */}
                {isCustomerCare ? (
                    <option value="LK-CC">LK-CC — Sri Lanka — Customer Care</option>
                ) : (
                    POS_LIST
                        .filter(p => p.code !== "LK-CC") // keep CC out of regular choices
                        .map(p => (
                            <option key={p.code} value={p.code}>
                                {p.code} — {p.name}
                            </option>
                        ))
                )}
            </select>

            {isCustomerCare && (
                <p className="text-xs text-gray-500 mt-1">
                    POS is fixed to <span className="font-medium">LK-CC</span> for Customer Care requests.
                </p>
            )}
        </div>
    );
}
