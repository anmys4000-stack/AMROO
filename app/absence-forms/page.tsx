import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// شرائح الإنذار حسب عدد أيام الغياب غير المعذور. القيم قابلة للتعديل حسب لائحة المدرسة.
const TIERS = [
  { min: 12, form: "تعهد بالالتزام بالحضور" },
  { min: 9, form: "إنذار ثانٍ" },
  { min: 6, form: "إنذار أول" },
  { min: 3, form: "إشعار ولي الأمر بالغياب" },
];

// نماذج الإنذار والتعهد: الطلاب الذين بلغت أيام غيابهم أحد الحدود، مع النموذج المقترح لكل طالب.
export default async function AbsenceFormsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "referrals:handle")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض نماذج الإنذار.</p>
      </main>
    );
  }

  const absences = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: { schoolId: user.schoolId, status: "ABSENT" },
    _count: { _all: true },
  });
  const counted = absences.filter((a) => a._count._all >= 3);
  const students = await prisma.student.findMany({
    where: { id: { in: counted.map((c) => c.studentId) }, schoolId: user.schoolId, isActive: true },
    select: { id: true, fullName: true, guardianName: true, schoolClass: { select: { name: true } } },
  });
  const byId = new Map(students.map((s) => [s.id, s]));

  const rows = counted
    .map((c) => {
      const s = byId.get(c.studentId);
      if (!s) return null;
      const tier = TIERS.find((t) => c._count._all >= t.min);
      return { id: s.id, name: s.fullName, className: s.schoolClass?.name ?? "", days: c._count._all, form: tier?.form ?? "" };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.days - a.days);

  return (
    <main className="page">
      <h1>نماذج الإنذار والتعهد</h1>
      <p>تُحسب أيام الغياب من سجل الحضور، وتُعرض الطلاب الذين بلغوا 3 أيام غياب فأكثر.</p>
      {rows.length === 0 ? (
        <p>لا يوجد طلاب بلغوا حد الإنذار.</p>
      ) : (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id} className="card row">
              <span>
                {r.name} · {r.className}
              </span>
              <span>
                {r.days} يوم · {r.form}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
