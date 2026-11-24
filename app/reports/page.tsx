import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
  EXCUSED: "بعذر",
};

// تقرير مختصر: الطلاب لكل فصل، وحالات الحضور لليوم، داخل مدرسة المستخدم فقط.
export default async function ReportsPage() {
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
        <p>ليست لديك صلاحية لعرض التقارير.</p>
      </main>
    );
  }

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const [classes, attendance] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { students: true } } },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { schoolId: user.schoolId, date: today },
      _count: { _all: true },
    }),
  ]);

  const totalStudents = classes.reduce((sum, c) => sum + c._count.students, 0);

  return (
    <main className="page">
      <h1>التقارير</h1>

      <section className="card">
        <h2>الحضور اليوم</h2>
        {attendance.length === 0 ? (
          <p>لم يُسجَّل حضور لليوم بعد.</p>
        ) : (
          <ul className="list">
            {attendance.map((a) => (
              <li key={a.status} className="row">
                <span>{STATUS_LABELS[a.status] ?? a.status}</span>
                <span>{a._count._all}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>تصدير إلى Excel</h2>
        <p>
          <a href="/api/export?type=students">قائمة الطلاب</a> · <a href="/api/export?type=behavior">السلوك</a> ·{" "}
          <a href="/api/export?type=attendance">الحضور</a>
        </p>
      </section>

      <section className="card">
        <h2>الطلاب لكل فصل</h2>
        <p>إجمالي الطلاب المرتبطين بفصل: {totalStudents}</p>
        <ul className="list">
          {classes.map((c) => (
            <li key={c.id} className="row">
              <span>{c.name}</span>
              <span>{c._count.students}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
