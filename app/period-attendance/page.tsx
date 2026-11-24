import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PeriodPanel from "./PeriodPanel";

// متابعة تحضير الحصص: لكل فصل في اليوم والحصة المختارين، هل حُضِّرت الحصة ومن حضّرها.
export default async function PeriodAttendancePage({ searchParams }: { searchParams: Promise<{ date?: string; period?: string }> }) {
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
        <p>ليست لديك صلاحية لعرض تحضير الحصص.</p>
      </main>
    );
  }

  const { date: rawDate, period: rawPeriod } = await searchParams;
  const riyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : riyadh.toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = date.getUTCDay() + 1;
  const p = Number(rawPeriod);
  const period = p >= 1 && p <= 8 ? p : 1;

  const [lessons, checks] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { schoolId: user.schoolId, weekday, period },
      select: { classId: true, subject: true, schoolClass: { select: { name: true } }, teacherId: true, teacherName: true },
      orderBy: { schoolClass: { name: "asc" } },
    }),
    prisma.periodCheck.findMany({
      where: { schoolId: user.schoolId, date, period },
      select: { classId: true, recordedBy: true },
    }),
  ]);

  const checked = new Map(checks.map((c) => [c.classId, c.recordedBy]));
  const me = user.id;
  const canRecordAll = hasPermission(user, "visits:approve");
  const rows = lessons.map((l) => ({
    classId: l.classId,
    className: l.schoolClass.name,
    subject: l.subject,
    teacher: l.teacherName ?? "",
    mine: l.teacherId === me,
    checked: checked.has(l.classId),
    checkedByMe: checked.get(l.classId) === me,
    canRecord: canRecordAll || l.teacherId === me,
  }));
  const done = rows.filter((r) => r.checked).length;

  return (
    <main className="page">
      <h1>متابعة تحضير الحصص</h1>
      <form method="GET" className="card">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <select name="period" defaultValue={String(period)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              الحصة {n}
            </option>
          ))}
        </select>
        <button type="submit">عرض</button>
      </form>
      <p>
        حُضِّر: {done} من {rows.length}
      </p>
      {rows.length === 0 ? (
        <p>لا توجد حصص في هذا اليوم والحصة.</p>
      ) : (
        <PeriodPanel date={iso} period={period} rows={rows} />
      )}
    </main>
  );
}
