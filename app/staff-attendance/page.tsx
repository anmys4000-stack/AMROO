import Link from "next/link";
import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PrintButton from "../violation-forms/PrintButton";

const KIND: Record<string, string> = { LATE: "تأخر", EARLY_LEAVE: "انصراف مبكر", ABSENT: "غياب" };
const LEAVE: Record<string, string> = { PENDING: "بانتظار الرد", APPROVED: "معتمد", REJECTED: "مرفوض" };

// دوام المعلمين: حضور وانصراف اليوم، وقائمة الاستئذانات والأعذار لذلك اليوم. للطباعة والمتابعة.
export default async function StaffAttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "visits:approve")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض دوام المعلمين.</p>
      </main>
    );
  }
  const { date: rawDate } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);

  const [records, leaves] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: { schoolId: user.schoolId, date },
      select: { id: true, kind: true, minutes: true, note: true, teacher: { select: { fullName: true } } },
      orderBy: { teacher: { fullName: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: { schoolId: user.schoolId, date },
      select: { leaveAt: true, returnAt: true, reason: true, status: true, teacher: { select: { fullName: true } } },
      orderBy: { leaveAt: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>دوام المعلمين والاستئذانات</h1>
      <form method="GET" className="card no-print">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <button type="submit">عرض</button>
        <PrintButton />
        <Link href="/services">تسجيل حالة حضور جديدة</Link>
      </form>

      <section className="card">
        <h2>حضور وانصراف المعلمين ({records.length})</h2>
        {records.length === 0 ? (
          <p>لا توجد حالات مسجّلة لهذا اليوم.</p>
        ) : (
          <table className="table">
            <thead><tr><th>المعلم</th><th>الحالة</th><th>الدقائق</th><th>ملاحظة</th></tr></thead>
            <tbody>{records.map((r) => <tr key={r.id}><td>{r.teacher.fullName}</td><td>{KIND[r.kind] ?? r.kind}</td><td>{r.minutes || ""}</td><td>{r.note ?? ""}</td></tr>)}</tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>قائمة الاستئذانات والأعذار ({leaves.length})</h2>
        {leaves.length === 0 ? (
          <p>لا توجد طلبات استئذان لهذا اليوم.</p>
        ) : (
          <table className="table">
            <thead><tr><th>المعلم</th><th>الخروج</th><th>العودة</th><th>السبب</th><th>الحالة</th></tr></thead>
            <tbody>{leaves.map((l, i) => <tr key={i}><td>{l.teacher.fullName}</td><td dir="ltr">{l.leaveAt}</td><td dir="ltr">{l.returnAt}</td><td>{l.reason}</td><td>{LEAVE[l.status] ?? l.status}</td></tr>)}</tbody>
          </table>
        )}
        <p><Link href="/leave">إدارة طلبات الاستئذان والاعتماد</Link></p>
      </section>
    </main>
  );
}
