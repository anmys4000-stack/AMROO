import { cookies } from "next/headers";
import { prisma } from "./db";
import { can, type Permission, type Role } from "./permissions";
import { readSessionToken } from "./session";

export type CurrentUser = {
  id: string;
  schoolId: string;
  role: Role;
  // كل الأدوار: الدور الرئيسي والأدوار الإضافية. الصلاحية تُمنح إذا منحها أي دور منها.
  roles: Role[];
};

// يقرأ الجلسة ويتحقق من المستخدم في قاعدة البيانات (نشط، ولا يحتاج تغيير كلمة المرور).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive || user.mustChangePassword) return null;
  const role = user.role as Role;
  const roles = Array.from(new Set<Role>([role, ...(user.extraRoles as Role[])]));
  return { id: user.id, schoolId: user.schoolId, role, roles };
}

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return user.roles.some((r) => can(r, permission));
}
