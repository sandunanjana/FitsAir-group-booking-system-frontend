export type SpecialRequirement = {
  code: string;
  name: string;
  alias?: string[];
};

export const SPECIAL_REQUIREMENTS: SpecialRequirement[] = [
  { code: "WHEELCHAIR", name: "Wheelchair for ramp" },
  { code: "SERVICE_HUB", name: "Service hub" },
  { code: "MEALS", name: "Meals" },
  { code: "FIRTSSHIELD", name: "firtsShield (Travel insurance)", alias: ["INSURANCE"] },
];

/** Normalize input to canonical code */
export function normalizeSpecialRequirement(input: string): string {
  const up = (input || "").toUpperCase();
  const hit = SPECIAL_REQUIREMENTS.find(
    r => r.code === up || r.alias?.includes(up)
  );
  return hit?.code ?? up;
}
