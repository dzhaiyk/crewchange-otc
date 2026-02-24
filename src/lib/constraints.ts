/**
 * Config-driven constraint validation for crew changes.
 *
 * The constraint system uses string-based "role keys" (e.g. "DD:day", "MWD:night")
 * to define forbidden same-day crew change pairs. This bridges the old hardcoded
 * scheduler to the new dynamic roles system — role names come from the database,
 * but the constraint config can reference them by name.
 */

export type RoleKey = string; // format: "{roleName}:{shift}" e.g. "DD:day"

export function makeRoleKey(roleName: string, shift: "day" | "night"): RoleKey {
  return `${roleName}:${shift}`;
}

export function parseRoleKey(key: RoleKey): { roleName: string; shift: "day" | "night" } {
  const [roleName, shift] = key.split(":");
  return { roleName: roleName!, shift: shift as "day" | "night" };
}

/**
 * Forbidden pairs: same-role different-shift and same-shift different-role
 * should not have crew changes on the same day. This mirrors the old scheduler's
 * ROLE_FORBIDDEN_MAP but expressed as config.
 */
export interface ConstraintConfig {
  forbiddenPairs: [RoleKey, RoleKey][];
}

export const DEFAULT_CONSTRAINT_CONFIG: ConstraintConfig = {
  forbiddenPairs: [
    // Same role, different shifts
    ["DD:day", "DD:night"],
    ["MWD:day", "MWD:night"],
    // Same shift, different roles
    ["DD:day", "MWD:day"],
    ["DD:night", "MWD:night"],
  ],
};

/**
 * Build a fast lookup map from the forbidden pairs config.
 */
export function buildForbiddenMap(
  config: ConstraintConfig = DEFAULT_CONSTRAINT_CONFIG
): Map<RoleKey, Set<RoleKey>> {
  const map = new Map<RoleKey, Set<RoleKey>>();

  for (const [a, b] of config.forbiddenPairs) {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  }

  return map;
}

/**
 * Check if two role keys are forbidden from having crew changes on the same day.
 */
export function isForbiddenSameDay(
  a: RoleKey,
  b: RoleKey,
  forbiddenMap?: Map<RoleKey, Set<RoleKey>>
): boolean {
  const map = forbiddenMap ?? buildForbiddenMap();
  return map.get(a)?.has(b) ?? false;
}

/**
 * Validate that a proposed crew change day doesn't violate any constraints.
 * Returns a list of conflict descriptions, empty if valid.
 */
export function validateCrewChangeDay(
  proposedRoleKey: RoleKey,
  date: string,
  existingChanges: Array<{ roleKey: RoleKey; date: string }>,
  config: ConstraintConfig = DEFAULT_CONSTRAINT_CONFIG
): string[] {
  const forbiddenMap = buildForbiddenMap(config);
  const conflicts: string[] = [];

  const changesOnDate = existingChanges.filter((c) => c.date === date);

  for (const existing of changesOnDate) {
    if (isForbiddenSameDay(proposedRoleKey, existing.roleKey, forbiddenMap)) {
      const proposed = parseRoleKey(proposedRoleKey);
      const conflict = parseRoleKey(existing.roleKey);
      conflicts.push(
        `${proposed.roleName} ${proposed.shift} cannot change on the same day as ${conflict.roleName} ${conflict.shift}`
      );
    }
  }

  return conflicts;
}
