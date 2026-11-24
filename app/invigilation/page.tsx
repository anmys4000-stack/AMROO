import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import InvigilationPanel from "./InvigilationPanel";

// لجان القاعات والملاحظون: لكل يوم اختبار وحصة، القاعات ومن يلاحظ فيها.
export default async function InvigilationPage({ searchParams }: { searchParams: Promise<{ date?: string; period?: string }> }) {
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
        <p>ليست لديك صلاحية لعرض لجان القاعات.</p>
      </main>
    );
  }

  const { date: rawDate, period: rawPeriod } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const period = Number(rawPeriod) >= 1 && Number(rawPeriod) <= 8 ? Number(rawPeriod) : 1;
  const date = new Date(`${iso}T00:00:00Z`);

  const [rows, teachers] = await Promise.all([
    prisma.examInvigilation.findMany({
      where: { schoolId: user.schoolId, date, period },
      orderBy: { room: "asc" },
      select: { id: true, room: true, teacher: { select: { fullName: true } } },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>لجان القاعات والملاحظون</h1>
      <form method="GET" className="card">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <select name="period" defaultValue={String(period)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
            <option key={p} value={p}>
              الحصة {p}
            </option>
          ))}
        </select>
        <button type="submit">عرض</button>
      </form>
      <InvigilationPanel
        date={iso}
        period={period}
        canEdit={hasPermission(user, "visits:approve")}
        teachers={teachers}
        rows={rows.map((r) => ({ id: r.id, room: r.room, teacher: r.teacher.fullName }))}
      />
    </main>
  );
}
