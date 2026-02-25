/**
 * Position configuration — maps system_key + shift to visual styles.
 *
 * Each field position (DD day, DD night, MWD day, MWD night) has a unique
 * color palette, icon, and gradient used across the calendar UI.
 */

import { DEFAULT_CONSTRAINT_CONFIG, parseRoleKey } from "./constraints";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PositionKey = "dd-day" | "dd-night" | "mwd-day" | "mwd-night";

export interface PositionConfig {
  key: PositionKey;
  label: string;
  systemKey: string; // role system_key, e.g. "DD"
  shift: "day" | "night";
  color: string; // CSS var reference
  colorHex: string; // hex for inline styles
  gradient: string; // Tailwind gradient classes
  softBg: string; // Tailwind soft background class
  icon: string; // shift icon
}

/* ------------------------------------------------------------------ */
/*  Position definitions                                               */
/* ------------------------------------------------------------------ */

export const POSITIONS: PositionConfig[] = [
  {
    key: "dd-day",
    label: "DD Day",
    systemKey: "DD",
    shift: "day",
    color: "var(--pos-dd-day)",
    colorHex: "#60A5FA",
    gradient: "from-blue-400 to-blue-500",
    softBg: "bg-blue-500/15",
    icon: "☀",
  },
  {
    key: "dd-night",
    label: "DD Night",
    systemKey: "DD",
    shift: "night",
    color: "var(--pos-dd-night)",
    colorHex: "#818CF8",
    gradient: "from-indigo-400 to-indigo-500",
    softBg: "bg-indigo-500/15",
    icon: "☽",
  },
  {
    key: "mwd-day",
    label: "MWD Day",
    systemKey: "MWD",
    shift: "day",
    color: "var(--pos-mwd-day)",
    colorHex: "#34D399",
    gradient: "from-emerald-400 to-emerald-500",
    softBg: "bg-emerald-500/15",
    icon: "☀",
  },
  {
    key: "mwd-night",
    label: "MWD Night",
    systemKey: "MWD",
    shift: "night",
    color: "var(--pos-mwd-night)",
    colorHex: "#2DD4BF",
    gradient: "from-teal-400 to-teal-500",
    softBg: "bg-teal-500/15",
    icon: "☽",
  },
];

/* ------------------------------------------------------------------ */
/*  Lookups                                                            */
/* ------------------------------------------------------------------ */

const positionMap = new Map<PositionKey, PositionConfig>(
  POSITIONS.map((p) => [p.key, p]),
);

/**
 * Derive PositionKey from a role's system_key and employee shift.
 */
export function getPositionKey(
  systemKey: string | null,
  shift: "day" | "night" | null,
): PositionKey | null {
  if (!systemKey || !shift) return null;
  const key = `${systemKey.toLowerCase()}-${shift}` as PositionKey;
  return positionMap.has(key) ? key : null;
}

/**
 * Get full config for a position key.
 */
export function getPositionConfig(key: PositionKey): PositionConfig {
  return positionMap.get(key)!;
}

/* ------------------------------------------------------------------ */
/*  Swap combos                                                        */
/* ------------------------------------------------------------------ */

export interface SwapCombo {
  a: PositionKey;
  b: PositionKey;
  aLabel: string;
  bLabel: string;
  isValid: boolean;
}

function roleKeyToPositionKey(roleKey: string): PositionKey | null {
  const { roleName, shift } = parseRoleKey(roleKey);
  return getPositionKey(roleName, shift);
}

/**
 * All 6 possible same-day swap pairings between the 4 positions,
 * with valid/invalid derived from the constraint config.
 */
export const ALL_SWAP_COMBOS: SwapCombo[] = (() => {
  const forbiddenSet = new Set(
    DEFAULT_CONSTRAINT_CONFIG.forbiddenPairs.map(([a, b]) => {
      const pa = roleKeyToPositionKey(a);
      const pb = roleKeyToPositionKey(b);
      return pa && pb ? [pa, pb].sort().join("|") : null;
    }).filter(Boolean) as string[],
  );

  const combos: SwapCombo[] = [];
  for (let i = 0; i < POSITIONS.length; i++) {
    for (let j = i + 1; j < POSITIONS.length; j++) {
      const a = POSITIONS[i]!;
      const b = POSITIONS[j]!;
      const pairKey = [a.key, b.key].sort().join("|");
      combos.push({
        a: a.key,
        b: b.key,
        aLabel: a.label,
        bLabel: b.label,
        isValid: !forbiddenSet.has(pairKey),
      });
    }
  }
  return combos;
})();
