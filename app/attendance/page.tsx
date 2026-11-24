import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
  EXCUSED: "بعذر",
};
const ORDER = ["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const;

// تقرير الحضور لتاريخ محدد: عدد كل حالة، وقائمة الغائبين مع فصولهم، داخل مدرسة المستخدم فقط.
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
        <p>ليست لديك صلاحية لعرض الحضور.</p>
      </main>
    );
  }

  const { date: rawDate } = await searchParams;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : today.toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);

  const [counts, absent] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["status"],
      where: { schoolId: user.schoolId, date },
      _count: { _all: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId: user.schoolId, date, status: "ABSENT" },
      select: { student: { select: { fullName: true, schoolClass: { select: { name: true } } } } },
      orderBy: { student: { fullName: "asc" } },
    }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const recorded = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <main className="page">
      <h1>تقرير الحضور</h1>
      <form method="GET" className="card">
        <label htmlFor="date">التاريخ</label>
        <input id="date" type="date" name="date" dir="ltr" defaultValue={iso} />
        <button type="submit">عرض</button>
      </form>

      {recorded === 0 ? (
        <p>لم يُسجَّل حضور لهذا التاريخ.</p>
      ) : (
        <section className="card">
          <p>
            المسجلون: {recorded} طالب
          </p>
          <ul className="list">
            {ORDER.map((s) => (
              <li key={s} className="row">
                <span>{STATUS_LABELS[s]}</span>
                <span>{countOf(s)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {absent.length > 0 && (
        <section className="card">
          <h2>الغائبون</h2>
          <ul className="list">
            {absent.map((a, i) => (
              <li key={i} className="row">
                <span>{a.student.fullName}</span>
                <span>{a.student.schoolClass?.name ?? "بدون فصل"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
