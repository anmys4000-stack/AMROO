import { cookies } from "next/headers";
import { prisma } from "./db";
import { can, type Permission, type Role } from "./permissions";
import { readSessionToken } from "./session";

export const VIEW_COOKIE = "amroo_view";

export type CurrentUser = {
  id: string;
  schoolId: string;
  // الدور النشط الآن (قد يكون غير الرئيسي إذا اختار المستخدم دورًا آخر من أدواره).
  role: Role;
  // الأدوار المستخدمة للصلاحيات: الدور النشط وحده إذا اختار دورًا، وإلا كل الأدوار.
  roles: Role[];
  // كل أدوار المستخدم: الرئيسي والإضافية، ولا تتغير بتبديل الدور.
  allRoles: Role[];
};

// يقرأ الجلسة ويتحقق من المستخدم في قاعدة البيانات (نشط، ولا يحتاج تغيير كلمة المرور).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive || user.mustChangePassword) return null;
  const primary = user.role as Role;
  const allRoles = Array.from(new Set<Role>([primary, ...(user.extraRoles as Role[])]));

  // تبديل الدور: لا يُقبل إلا دور يملكه المستخدم فعلًا.
  const picked = store.get(VIEW_COOKIE)?.value as Role | undefined;
  const view = picked && allRoles.includes(picked) ? picked : null;
  return {
    id: user.id,
    schoolId: user.schoolId,
    role: view ?? primary,
    roles: view ? [view] : allRoles,
    allRoles,
  };
}

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return user.roles.some((r) => can(r, permission));
}
