import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import CommitteesPanel from "./CommitteesPanel";

// لجان الاختبارات: كل لجنة مع أعضائها وأدوارهم، وإمكانية الطباعة.
export default async function CommitteesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض اللجان.</p>
      </main>
    );
  }

  const [committees, teachers] = await Promise.all([
    prisma.examCommittee.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, members: { select: { role: true, teacher: { select: { fullName: true } } } } },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>لجان الاختبارات</h1>
      <CommitteesPanel
        canEdit={hasPermission(user, "visits:approve")}
        teachers={teachers}
        committees={committees.map((c) => ({
          id: c.id,
          name: c.name,
          members: c.members.map((m) => ({ name: m.teacher.fullName, role: m.role })),
        }))}
      />
    </main>
  );
}
