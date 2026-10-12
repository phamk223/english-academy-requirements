export const Role = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', STUDENT: 'STUDENT' } as const;
export type Role = typeof Role[keyof typeof Role];

export const Permission = {
  SELF_READ: 'self:read',
  STUDENTS_READ: 'students:read',
  STUDENTS_MANAGE: 'students:manage',
  CONTENT_READ: 'content:read',
  CONTENT_MANAGE: 'content:manage',
  ASSIGNMENTS_MANAGE: 'assignments:manage',
  REPORTS_READ: 'reports:read',
  ASSIGNED_LESSONS_READ: 'assigned-lessons:read',
  OWN_ATTEMPTS_MANAGE: 'own-attempts:manage',
  OWN_PROGRESS_READ: 'own-progress:read',
  OWN_LISTENING_WRITE: 'own-listening:write',
} as const;
export type Permission = typeof Permission[keyof typeof Permission];

// Explicit allowlists, no implicit role hierarchy. Teacher business scope is unapproved.
export const PERMISSION_ROLES: Readonly<Record<Permission, readonly Role[]>> = Object.freeze({
  [Permission.SELF_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.STUDENTS_READ]: Object.freeze([Role.ADMIN]),
  [Permission.STUDENTS_MANAGE]: Object.freeze([Role.ADMIN]),
  [Permission.CONTENT_READ]: Object.freeze([Role.ADMIN]),
  [Permission.CONTENT_MANAGE]: Object.freeze([Role.ADMIN]),
  [Permission.ASSIGNMENTS_MANAGE]: Object.freeze([Role.ADMIN]),
  [Permission.REPORTS_READ]: Object.freeze([Role.ADMIN]),
  [Permission.ASSIGNED_LESSONS_READ]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_ATTEMPTS_MANAGE]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_PROGRESS_READ]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_LISTENING_WRITE]: Object.freeze([Role.STUDENT]),
});

export function hasPermission(roles: readonly string[], permission: Permission): boolean {
  const allowed = PERMISSION_ROLES[permission] ?? [];
  return roles.some(role => allowed.includes(role as Role));
}
