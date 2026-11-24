import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import SettingsPanel from "./SettingsPanel";

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "مدير المدرسة",
  STUDENT_AFFAIRS: "وكيل شؤون الطلاب",
  GUIDANCE: "الموجه الطلابي",
  ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية",
  TEACHER: "معلم",
  GUARDIAN: "ولي أمر",
};

// الإعدادات: اسم المدرسة، والمستخدمون وأدوارهم، والفصول. متاحة للمدير فقط.
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "users:manage")) {
    return (
      <main className="page">
        <p>الإعدادات متاحة للمدير فقط.</p>
      </main>
    );
  }

  const [school, users, classes] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>الإعدادات</h1>
      <SettingsPanel
        schoolName={school?.name ?? ""}
        users={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: ROLE_LABELS[u.role] ?? u.role,
          isActive: u.isActive,
        }))}
        classCount={classes.length}
      />
    </main>
  );
}
