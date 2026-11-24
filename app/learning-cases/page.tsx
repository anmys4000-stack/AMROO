import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import LearningCasesPanel from "./LearningCasesPanel";

// حالات صعوبات التعلم والنطق: المفتوحة والمغلقة، مع فتح حالة جديدة وإغلاقها للمخوّلين.
export default async function LearningCasesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "referrals:handle") && !hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الحالات.</p>
      </main>
    );
  }

  const [cases, students] = await Promise.all([
    prisma.learningCase.findMany({
      where: { schoolId: user.schoolId },
      orderBy: [{ open: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: { id: true, kind: true, description: true, open: true, createdAt: true, student: { select: { fullName: true } } },
    }),
    prisma.student.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
  ]);

  return (
    <main className="page">
      <h1>صعوبات التعلم والنطق</h1>
      <LearningCasesPanel
        canEdit={hasPermission(user, "referrals:handle")}
        students={students}
        cases={cases.map((c) => ({
          id: c.id,
          studentName: c.student.fullName,
          kind: c.kind === "SPEECH" ? "نطق" : "تعلم",
          description: c.description,
          open: c.open,
          date: c.createdAt.toISOString().slice(0, 10),
        }))}
      />
    </main>
  );
}
