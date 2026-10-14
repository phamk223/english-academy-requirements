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
  { module: 'students', methods: ['GET'], path: '/students', permission: Permission.STUDENTS_READ, resourceScope: 'center' },
  { module: 'students', methods: ['GET'], path: '/students/:id', permission: Permission.STUDENTS_READ, resourceScope: 'center' },
  { module: 'students', methods: ['POST'], path: '/students', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['PATCH'], path: '/students/:id', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['POST'], path: '/students/:id/reset-password', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'students', methods: ['PATCH'], path: '/students/:id/status', permission: Permission.STUDENTS_MANAGE, resourceScope: 'center' },
  { module: 'teachers', methods: ['GET','POST','PATCH','DELETE'], path: '/teachers/*', permission: Permission.TEACHERS_MANAGE, resourceScope: 'center' },
  { module: 'classes', methods: ['GET','POST','PATCH','DELETE'], path: '/classes/*', permission: Permission.CLASSES_MANAGE, resourceScope: 'assigned' },
  { module: 'classes', methods: ['GET'], path: '/classes/:id/members', permission: Permission.CLASSES_MEMBERS_READ, resourceScope: 'assigned' },
  { module: 'classes', methods: ['POST','DELETE'], path: '/classes/:id/members/*', permission: Permission.CLASSES_MEMBERS_MANAGE, resourceScope: 'assigned' },
  { module: 'exams', methods: ['GET'], path: '/exams[/:id]', permission: Permission.EXAMS_READ, resourceScope: 'assigned' },
  { module: 'exams', methods: ['POST','PATCH','DELETE'], path: '/exams[/:id]', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'exam-sections', methods: ['POST'], path: '/exams/:examId/sections', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'exam-sections', methods: ['PATCH','DELETE'], path: '/sections/:id', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'questions', methods: ['POST'], path: '/sections/:sectionId/questions', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'questions', methods: ['GET'], path: '/sections/:sectionId/questions', permission: Permission.EXAMS_READ, resourceScope: 'assigned' },
  { module: 'questions', methods: ['PATCH','DELETE'], path: '/questions/:questionId', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'questions', methods: ['POST'], path: '/questions/reorder', permission: Permission.EXAMS_MANAGE, resourceScope: 'self' },
  { module: 'media', methods: ['POST'], path: '/media/upload', permission: Permission.MEDIA_MANAGE, resourceScope: 'self' },
  { module: 'media', methods: ['POST'], path: '/media/:id/attachments', permission: Permission.MEDIA_MANAGE, resourceScope: 'self' },
  { module: 'media', methods: ['DELETE'], path: '/media/:id', permission: Permission.MEDIA_MANAGE, resourceScope: 'self' },
  { module: 'media', methods: ['GET'], path: '/media/:id/content', permission: Permission.MEDIA_READ, resourceScope: 'assigned' },
  { module: 'assignments', methods: ['POST'], path: '/exams/:id/assignments', permission: Permission.ASSIGNMENTS_MANAGE, resourceScope: 'self' },
  { module: 'assignments', methods: ['GET'], path: '/students/me/assignments', permission: Permission.ASSIGNMENTS_READ, resourceScope: 'self' },
  { module: 'assignments', methods: ['GET'], path: '/students/:id/assignments', permission: Permission.ASSIGNMENTS_READ, resourceScope: 'assigned' },
  { module: 'assignments', methods: ['GET'], path: '/students/:id/assignments', permission: Permission.ASSIGNMENTS_READ, resourceScope: 'assigned' },
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
