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
  | "students:manage"
  | "students:view"
  | "attendance:record"
  | "timetable:manage"
  | "behavior:record"
  | "referrals:handle"
  | "visits:approve"
  | "guardian:view_own_child";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PRINCIPAL: [
    "users:manage",
    "students:manage",
    "students:view",
    "attendance:record",
    "timetable:manage",
    "behavior:record",
    "referrals:handle",
    "visits:approve",
  ],
  STUDENT_AFFAIRS: ["students:manage", "students:view", "attendance:record", "behavior:record"],
  GUIDANCE: ["students:view", "referrals:handle"],
  ACADEMIC_DEPUTY: ["students:view", "timetable:manage", "visits:approve"],
  TEACHER: ["students:view", "attendance:record", "behavior:record"],
  GUARDIAN: ["guardian:view_own_child"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// فصل البيانات: المستخدم لا يصل إلا لسجلات مدرسته.
export function sameSchool(userSchoolId: string, recordSchoolId: string): boolean {
  return userSchoolId.length > 0 && userSchoolId === recordSchoolId;
}
