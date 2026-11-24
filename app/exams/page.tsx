import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import ExamsPanel from "./ExamsPanel";

// جدول الاختبارات: الأيام والحصص وما يُختبر فيه كل فصل، مع إضافة وحذف للمخوّلين.
export default async function ExamsPage() {
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
        <p>ليست لديك صلاحية لعرض الاختبارات.</p>
      </main>
    );
  }

  const [slots, classes] = await Promise.all([
    prisma.examSlot.findMany({
      where: { schoolId: user.schoolId },
      orderBy: [{ date: "asc" }, { period: "asc" }],
      select: { id: true, date: true, period: true, subject: true, schoolClass: { select: { name: true } } },
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>جدول الاختبارات</h1>
      <ExamsPanel
        canEdit={hasPermission(user, "visits:approve")}
        classes={classes}
        slots={slots.map((s) => ({
          id: s.id,
          date: s.date.toISOString().slice(0, 10),
          period: s.period,
          subject: s.subject,
          className: s.schoolClass.name,
        }))}
      />
    </main>
  );
}
