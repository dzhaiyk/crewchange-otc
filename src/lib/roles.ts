export const ROLES = ["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  DD_DAY: "DD Day",
  DD_NIGHT: "DD Night",
  MWD_DAY: "MWD Day",
  MWD_NIGHT: "MWD Night",
};

export const ROLE_ORDER: Role[] = ["DD_DAY", "DD_NIGHT", "MWD_DAY", "MWD_NIGHT"];

export const FORBIDDEN_SAME_DAY: Array<[Role, Role]> = [
  ["DD_DAY", "DD_NIGHT"],
  ["MWD_DAY", "MWD_NIGHT"],
  ["DD_DAY", "MWD_DAY"],
  ["DD_NIGHT", "MWD_NIGHT"],
];

export const ROLE_FORBIDDEN_MAP: Record<Role, Set<Role>> = {
  DD_DAY: new Set(["DD_NIGHT", "MWD_DAY"]),
  DD_NIGHT: new Set(["DD_DAY", "MWD_NIGHT"]),
  MWD_DAY: new Set(["MWD_NIGHT", "DD_DAY"]),
  MWD_NIGHT: new Set(["MWD_DAY", "DD_NIGHT"]),
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}
