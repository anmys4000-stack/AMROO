// صلاحيات كل دور: كل دور يرى ما يخص وظيفته فقط.
export type Role =
  | "PRINCIPAL"
  | "STUDENT_AFFAIRS"
  | "GUIDANCE"
  | "ACADEMIC_DEPUTY"
  | "TEACHER"
  | "GUARDIAN";

export type Permission =
  | "users:manage"
  | "timetable:manage"
  | "behavior:record"
  | "referrals:handle"
  | "visits:approve"
  | "guardian:view_own_child";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PRINCIPAL: ["users:manage", "timetable:manage", "behavior:record", "referrals:handle", "visits:approve"],
  STUDENT_AFFAIRS: ["behavior:record"],
  GUIDANCE: ["referrals:handle"],
  ACADEMIC_DEPUTY: ["timetable:manage", "visits:approve"],
  TEACHER: ["behavior:record"],
  GUARDIAN: ["guardian:view_own_child"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// فصل البيانات: المستخدم لا يصل إلا لسجلات مدرسته.
export function sameSchool(userSchoolId: string, recordSchoolId: string): boolean {
  return userSchoolId.length > 0 && userSchoolId === recordSchoolId;
}
