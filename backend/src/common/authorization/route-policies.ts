import { Permission } from './permissions';

export interface RoutePermission {
  module: string;
  methods: readonly string[];
  path: string;
  permission: Permission;
  resourceScope: 'self' | 'assigned' | 'center';
}

// Contract for future controllers, not route registration or a URL-based security matcher.
// Actual controllers must use @RequirePermission() and enforce resource scope in services.
export const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  { module: 'auth', methods: ['GET'], path: '/auth/me', permission: Permission.SELF_READ, resourceScope: 'self' },
  { module: 'students', methods: ['GET'], path: '/api/v1/admin/students', permission: Permission.STUDENTS_READ, resourceScope: 'center' },
  { module: 'students', methods: ['GET'], path: '/api/v1/admin/students/:id', permission: Permission.STUDENTS_READ, resourceScope: 'center' },
  { module: 'students', methods: ['POST'], path: '/api/v1/admin/students', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['PATCH'], path: '/api/v1/admin/students/:id', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['PATCH'], path: '/api/v1/admin/students/:id/password', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['PATCH'], path: '/api/v1/admin/students/:id/status', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'content', methods: ['GET'], path: '/api/v1/admin/content/*', permission: Permission.CONTENT_READ, resourceScope: 'center' },
  { module: 'content', methods: ['POST', 'PATCH', 'DELETE'], path: '/api/v1/admin/content/*', permission: Permission.CONTENT_MANAGE, resourceScope: 'center' },
  { module: 'assignments', methods: ['POST'], path: '/api/v1/admin/assignments', permission: Permission.ASSIGNMENTS_MANAGE, resourceScope: 'center' },
  { module: 'assignments', methods: ['PATCH', 'DELETE'], path: '/api/v1/admin/assignments/:id', permission: Permission.ASSIGNMENTS_MANAGE, resourceScope: 'center' },
  { module: 'reports', methods: ['GET'], path: '/api/v1/admin/reports/*', permission: Permission.REPORTS_READ, resourceScope: 'center' },
  { module: 'learning', methods: ['GET'], path: '/api/v1/me/lessons', permission: Permission.ASSIGNED_LESSONS_READ, resourceScope: 'assigned' },
  { module: 'learning', methods: ['GET'], path: '/api/v1/me/lessons/:id', permission: Permission.ASSIGNED_LESSONS_READ, resourceScope: 'assigned' },
  { module: 'attempts', methods: ['POST'], path: '/api/v1/me/attempts', permission: Permission.OWN_ATTEMPTS_MANAGE, resourceScope: 'self' },
  { module: 'attempts', methods: ['PATCH'], path: '/api/v1/me/attempts/:id', permission: Permission.OWN_ATTEMPTS_MANAGE, resourceScope: 'self' },
  { module: 'progress', methods: ['GET'], path: '/api/v1/me/progress', permission: Permission.OWN_PROGRESS_READ, resourceScope: 'self' },
  { module: 'listening', methods: ['POST'], path: '/api/v1/me/listening-events', permission: Permission.OWN_LISTENING_WRITE, resourceScope: 'self' },
];
