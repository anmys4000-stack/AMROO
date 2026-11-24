import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PrintButton from "../violation-forms/PrintButton";
import GenerateForm from "./GenerateForm";

// كشف الإشراف على الفسحة والمناوبة لليوم المختار، من تعيينات الإشراف الموجودة، للطباعة والاعتماد.
export default async function DutySheetsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
        <p>ليست لديك صلاحية لطباعة كشوف الإشراف.</p>
      </main>
    );
  }

  const { date: rawDate } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);

  const assignments = await prisma.dutyAssignment.findMany({
    where: { schoolId: user.schoolId, date },
    select: { kind: true, teacher: { select: { fullName: true } } },
    orderBy: { teacher: { fullName: "asc" } },
  });
  const breaks = assignments.filter((a) => a.kind === "BREAK").map((a) => a.teacher.fullName);
  const duties = assignments.filter((a) => a.kind === "DUTY").map((a) => a.teacher.fullName);

  return (
    <main className="page">
      <h1>كشف الإشراف والمناوبة</h1>
      {hasPermission(user, "visits:approve") && <GenerateForm defaultDate={iso} />}
      <form method="GET" className="card no-print">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <button type="submit">عرض</button>
        <PrintButton />
      </form>
      <section className="card sheet">
        <p>التاريخ: <span dir="ltr">{iso}</span></p>
        <h2>الإشراف على الفسحة</h2>
        {breaks.length === 0 ? <p>لا توجد تعيينات.</p> : <ol>{breaks.map((n) => <li key={`b-${n}`}>{n}</li>)}</ol>}
        <h2>المناوبة</h2>
        {duties.length === 0 ? <p>لا توجد تعيينات.</p> : <ol>{duties.map((n) => <li key={`d-${n}`}>{n}</li>)}</ol>}
        <p>اعتماد الوكيل: ____________ · التوقيع: ____________</p>
      </section>
    </main>
  );
}
