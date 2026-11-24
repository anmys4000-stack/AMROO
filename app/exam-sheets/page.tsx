import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PrintButton from "./PrintButton";

// كشوف الاختبارات المطبوعة: لكل فصل في اليوم المختار، كشف المناداة وكشف الطلاب وتسليم أوراق الإجابة، ومحضر فتح المظروف.
export default async function ExamSheetsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
        <p>ليست لديك صلاحية لطباعة كشوف الاختبارات.</p>
      </main>
    );
  }

  const { date: rawDate } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);

  const slots = await prisma.examSlot.findMany({
    where: { schoolId: user.schoolId, date },
    orderBy: [{ period: "asc" }],
    select: {
      id: true,
      period: true,
      subject: true,
      schoolClass: {
        select: {
          name: true,
          students: { where: { isActive: true }, select: { fullName: true }, orderBy: { fullName: "asc" } },
        },
      },
    },
  });

  return (
    <main className="page">
      <h1>كشوف الاختبارات</h1>
      <form method="GET" className="card no-print">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <button type="submit">عرض</button>
        <PrintButton />
      </form>
      {slots.length === 0 ? (
        <p>لا توجد اختبارات مجدولة في هذا اليوم.</p>
      ) : (
        slots.map((s) => (
          <section key={s.id} className="card sheet">
            <h2>
              {s.schoolClass.name} · {s.subject} · الحصة {s.period} · <span dir="ltr">{iso}</span>
            </h2>
            <h3>كشف المناداة (تسليم أوراق الإجابة)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الطالب</th>
                  <th>التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {s.schoolClass.students.map((st, i) => (
                  <tr key={`${s.id}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{st.fullName}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>محضر فتح المظروف</h3>
            <p>
              وقت فتح المظروف: ____________ · اسم المراقب: ____________ · التوقيع: ____________
            </p>
          </section>
        ))
      )}
    </main>
  );
}
