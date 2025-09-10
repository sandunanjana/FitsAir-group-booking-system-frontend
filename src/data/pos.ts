export type POS = { code: string; name: string; alias?: string[] };

export const POS_LIST: POS[] = [
    { code: "LK", name: "Sri Lanka" },
    { code: "BD", name: "Bangladesh", alias: ["BG"] }, // accept BG but submit BD
    { code: "AE", name: "United Arab Emirates" },
//    { code: "MY", name: "Malaysia" },
    { code: "MV", name: "Maldives" },
    { code: "IN", name: "India" },
    { code: "SG", name: "Singapore" },
//    { code: "TH", name: "Thailand" },
    { code: "KUL", name: "Kuala Lumpur" },
//    { code: "SA", name: "Saudi Arabia" },

    // Special POS for Customer Care
    { code: "LK-CC", name: "Sri Lanka — Customer Care" },
];

export function normalizePos(input: string): string {
    const up = (input || "").toUpperCase();
    if (up === "BG") return "BD";
    // Allow passthrough for hyphenated POS like LK-CC
    const hit = POS_LIST.find(p => p.code === up || p.alias?.includes(up));
    return hit?.code ?? up;
}
