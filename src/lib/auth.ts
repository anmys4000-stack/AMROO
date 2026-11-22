import { cookies } from "next/headers";
import { prisma } from "./db";
import { can, type Permission, type Role } from "./permissions";
import { readSessionToken } from "./session";

export type CurrentUser = {
  id: string;
  schoolId: string;
  role: Role;
};

// يقرأ الجلسة ويتحقق من المستخدم في قاعدة البيانات (نشط، ولا يحتاج تغيير كلمة المرور).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive || user.mustChangePassword) return null;
  return { id: user.id, schoolId: user.schoolId, role: user.role as Role };
}

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return can(user.role, permission);
}
