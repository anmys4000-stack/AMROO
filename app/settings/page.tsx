import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import SettingsPanel from "./SettingsPanel";
import OperationsPanel from "./OperationsPanel";

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "مدير المدرسة",
  STUDENT_AFFAIRS: "وكيل شؤون الطلاب",
  GUIDANCE: "الموجه الطلابي",
  ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية",
  TEACHER: "معلم",
  GUARDIAN: "ولي أمر",
  ACTIVITY_LEADER: "رائد النشاط",
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
    prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { name: true, ministryNumber: true, region: true, city: true, stages: true, schoolType: true, planType: true, academicYear: true, currentTerm: true, compensationPoints: true },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, fullName: true, email: true, role: true, extraRoles: true, isActive: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true, counselorId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const counselors = await prisma.user.findMany({
    where: { schoolId: user.schoolId, isActive: true, OR: [{ role: "GUIDANCE" }, { extraRoles: { has: "GUIDANCE" } }] },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <main className="page">
      <h1>الإعدادات</h1>
      <SettingsPanel
        schoolName={school?.name ?? ""}
        profile={{
          ministryNumber: school?.ministryNumber ?? "",
          region: school?.region ?? "",
          city: school?.city ?? "",
          stages: school?.stages ?? [],
          schoolType: school?.schoolType ?? "بنين",
          planType: school?.planType ?? "عام",
          academicYear: school?.academicYear ?? "",
          currentTerm: school?.currentTerm ?? "الفصل الأول",
          compensationPoints: school?.compensationPoints ?? 80,
        }}
        users={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: ROLE_LABELS[u.role] ?? u.role,
          roleKey: u.role,
          extraRoles: u.extraRoles as string[],
          isActive: u.isActive,
        }))}
        classCount={classes.length}
      />
      <OperationsPanel classes={classes} counselors={counselors} />
    </main>
  );
}
