import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import DutyPanel from "./DutyPanel";

// جدول الإشراف والمناوبة للأسبوع: الأيام من الأحد إلى الخميس، مع المعلمين المعيّنين في كل يوم.
export default async function DutyPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
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
        <p>ليست لديك صلاحية لعرض الإشراف.</p>
      </main>
    );
  }

  const { week } = await searchParams;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(week ?? "")
    ? new Date(`${week}T00:00:00Z`)
    : (() => {
        const riyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
        riyadh.setHours(0, 0, 0, 0);
        riyadh.setDate(riyadh.getDate() - riyadh.getDay());
        return new Date(riyadh.toISOString().slice(0, 10) + "T00:00:00Z");
      })();
  const days = Array.from({ length: 5 }, (_, i) => new Date(start.getTime() + i * 86400000));
  const end = new Date(start.getTime() + 5 * 86400000);

  const [assignments, teachers] = await Promise.all([
    prisma.dutyAssignment.findMany({
      where: { schoolId: user.schoolId, date: { gte: start, lt: end } },
      select: { id: true, date: true, kind: true, teacher: { select: { fullName: true, id: true } } },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const canEdit = hasPermission(user, "visits:approve");
  const dayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

  return (
    <main className="page">
      <h1>الإشراف والمناوبة</h1>
      <DutyPanel
        canEdit={canEdit}
        weekStart={start.toISOString().slice(0, 10)}
        days={days.map((d, i) => ({
          date: d.toISOString().slice(0, 10),
          label: dayLabels[i],
          break: assignments
            .filter((a) => a.kind === "BREAK" && a.date.toISOString().slice(0, 10) === d.toISOString().slice(0, 10))
            .map((a) => ({ id: a.id, name: a.teacher.fullName })),
          duty: assignments
            .filter((a) => a.kind === "DUTY" && a.date.toISOString().slice(0, 10) === d.toISOString().slice(0, 10))
            .map((a) => ({ id: a.id, name: a.teacher.fullName })),
        }))}
        teachers={teachers}
      />
    </main>
  );
}
