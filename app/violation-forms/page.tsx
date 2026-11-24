import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PrintButton from "./PrintButton";

// نموذج محضر المخالفة: يختار المسؤول الطالب والتاريخ والحصة، ثم يطبع النموذج مع بيانات الطالب ولي أمره.
export default async function ViolationFormPage({ searchParams }: { searchParams: Promise<{ student?: string; date?: string; period?: string }> }) {
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
        <p>ليست لديك صلاحية لطباعة نماذج المخالفات.</p>
      </main>
    );
  }

  const { student: studentId, date: rawDate, period: rawPeriod } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const p = Number(rawPeriod);
  const period = p >= 1 && p <= 8 ? p : 1;

  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId, isActive: true },
    select: { id: true, fullName: true, guardianName: true, guardianPhone: true, schoolClass: { select: { name: true } } },
    orderBy: { fullName: "asc" },
    take: 800,
  });
  const selected = studentId ? students.find((s) => s.id === studentId) : undefined;

  return (
    <main className="page">
      <h1>نموذج محضر مخالفة</h1>
      <form method="GET" className="card no-print">
        <select name="student" defaultValue={selected?.id ?? ""} required>
          <option value="">اختر الطالب</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName} · {s.schoolClass?.name ?? ""}</option>
          ))}
        </select>
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <select name="period" defaultValue={String(period)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>الحصة {n}</option>
          ))}
        </select>
        <button type="submit">عرض النموذج</button>
      </form>
      {selected && (
        <section className="card sheet">
          <h2>محضر مخالفة</h2>
          <p>اسم الطالب: {selected.fullName} · الفصل: {selected.schoolClass?.name ?? "-"}</p>
          <p>ولي الأمر: {selected.guardianName ?? "-"} · <span dir="ltr">{selected.guardianPhone ?? ""}</span></p>
          <p>التاريخ: <span dir="ltr">{iso}</span> · الحصة: {period}</p>
          <p>وصف المخالفة:</p>
          <p>______________________________________________________________</p>
          <p>______________________________________________________________</p>
          <p>الإجراء المتخذ: ____________________ · توقيع المعلم: ____________ · توقيع الوكيل: ____________</p>
          <PrintButton />
        </section>
      )}
    </main>
  );
}
