import { Role } from "@prisma/client";

export type AdminPermission =
  | "dashboard:view"
  | "vehicles:view"
  | "vehicles:manage"
  | "vehicles:moderate"
  | "vehicles:approve"
  | "dealers:view"
  | "dealers:manage"
  | "users:view"
  | "users:manage"
  | "users:admin_manage"
  | "content:view"
  | "content:manage"
  | "leads:view"
  | "leads:manage"
  | "reports:view"
  | "reports:export"
  | "settings:view"
  | "settings:manage"
  | "audit:view"
  | "audit:admin_surveillance"
  | "notifications:view";

const ROLE_PERMISSIONS: Record<Role, AdminPermission[]> = {
  SUPER_ADMIN: [
    "dashboard:view", "vehicles:view", "vehicles:manage", "vehicles:moderate", "vehicles:approve",
    "dealers:view", "dealers:manage", "users:view", "users:manage", "users:admin_manage",
    "content:view", "content:manage", "leads:view", "leads:manage",
    "reports:view", "reports:export", "settings:view", "settings:manage",
    "audit:view", "audit:admin_surveillance", "notifications:view",
  ],
  ADMIN: [
    "dashboard:view", "vehicles:view", "vehicles:manage",
    "dealers:view", "leads:view", "leads:manage",
    "reports:view", "notifications:view", "settings:view",
  ],
  DEALER_MANAGER: [
    "dashboard:view", "vehicles:view", "vehicles:manage",
    "dealers:view", "leads:view", "leads:manage", "notifications:view", "settings:view",
  ],
  CONTENT_MANAGER: [
    "dashboard:view", "content:view", "content:manage", "notifications:view",
  ],
  SUPPORT_AGENT: [
    "dashboard:view", "leads:view", "leads:manage", "users:view", "notifications:view",
  ],
};

export const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.DEALER_MANAGER,
  Role.CONTENT_MANAGER,
  Role.SUPPORT_AGENT,
];

export function hasPermission(role: Role, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessAdmin(role: Role): boolean {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  DEALER_MANAGER: "Dealer Manager",
  CONTENT_MANAGER: "Content Manager",
  SUPPORT_AGENT: "Support Agent",
};

export const ASSIGNABLE_ADMIN_ROLES: Role[] = [
  Role.ADMIN,
  Role.DEALER_MANAGER,
  Role.CONTENT_MANAGER,
  Role.SUPPORT_AGENT,
];
