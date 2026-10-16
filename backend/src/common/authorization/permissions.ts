export const Role = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', STUDENT: 'STUDENT' } as const;
export type Role = typeof Role[keyof typeof Role];

export const Permission = {
  SELF_READ: 'self:read',
  ACCOUNTS_DELETE: 'accounts:delete',
  ACCOUNTS_STATUS: 'accounts:status',
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
  TEACHERS_READ: 'teachers:read',
  TEACHERS_MANAGE: 'teachers:manage',
  CLASSES_READ: 'classes:read',
  CLASSES_MANAGE: 'classes:manage',
  CLASSES_MEMBERS_READ: 'classes:members:read',
  CLASSES_MEMBERS_MANAGE: 'classes:members:manage',
  EXAMS_READ: 'exams:read',
  EXAMS_MANAGE: 'exams:manage',
  MEDIA_READ: 'media:read',
  MEDIA_MANAGE: 'media:manage',
  ASSIGNMENTS_READ: 'assignments:read',
  ATTEMPTS_READ: 'attempts:read',
  IMPORTS_MANAGE: 'imports:manage',
} as const;
export type Permission = typeof Permission[keyof typeof Permission];

// Explicit allowlists, no implicit role hierarchy. Resource ownership is checked in services.
export const PERMISSION_ROLES: Readonly<Record<Permission, readonly Role[]>> = Object.freeze({
  [Permission.SELF_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.ACCOUNTS_DELETE]: Object.freeze([Role.ADMIN]),
  [Permission.ACCOUNTS_STATUS]: Object.freeze([Role.ADMIN]),
  [Permission.STUDENTS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.STUDENTS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.TEACHERS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.TEACHERS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.CLASSES_READ]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.CLASSES_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.CLASSES_MEMBERS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.CLASSES_MEMBERS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.EXAMS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.EXAMS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.MEDIA_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.MEDIA_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.ASSIGNMENTS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.ATTEMPTS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER, Role.STUDENT]),
  [Permission.IMPORTS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.CONTENT_READ]: Object.freeze([Role.ADMIN]),
  [Permission.CONTENT_MANAGE]: Object.freeze([Role.ADMIN]),
  [Permission.ASSIGNMENTS_MANAGE]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.REPORTS_READ]: Object.freeze([Role.ADMIN, Role.TEACHER]),
  [Permission.ASSIGNED_LESSONS_READ]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_ATTEMPTS_MANAGE]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_PROGRESS_READ]: Object.freeze([Role.STUDENT]),
  [Permission.OWN_LISTENING_WRITE]: Object.freeze([Role.STUDENT]),
});

export function hasPermission(roles: readonly string[], permission: Permission): boolean {
  const allowed = PERMISSION_ROLES[permission] ?? [];
  return roles.some(role => allowed.includes(role as Role));
}
