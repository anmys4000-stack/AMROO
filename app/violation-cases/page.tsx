import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// ملف الحالة: مخالفات الطالب مع الإجراءات الموصى بها (حسب دليل وزارة التعليم كما يعرضها مسار)،
// وروابط مباشرة لنماذج الإجراء المطبوعة للطالب نفسه.
const RECOMMENDED = [
  { label: "استدعاء ولي الأمر", note: "دعوة ولي الأمر ومناقشته في خطة تعديل السلوك، وأخذ تعهد خطي وتوقيع ولي الأمر", href: "guardian-invitation" },
  { label: "حسم درجات", note: "حسم درجات من السلوك الإيجابي مع إشعار ولي الأمر وإتاحة فرص التعويض", href: null },
  { label: "اعتذار", note: "الاعتذار لمن أساء إليهم", href: null },
  { label: "إصلاح الضرر", note: "إصلاح ما أتلفه الطالب أو إحضار بديل عنه", href: null },
  { label: "مصادرة", note: "مصادرة الممنوعات وإتلافها من لجنة التوجيه الطلابي وإعداد محضر بذلك", href: "incident-record" },
  { label: "التوجيه الطلابي", note: "إحالة الطالب إلى الموجه الطلابي لدراسة حالته", href: null },
];

export default async function ViolationCasesPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "behavior:record")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض ملفات الحالات.</p>
      </main>
    );
  }

  const { student: studentId } = await searchParams;
  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId, isActive: true },
    select: { id: true, fullName: true, schoolClass: { select: { name: true } } },
    orderBy: { fullName: "asc" },
    take: 800,
  });
  const selected = studentId ? students.find((s) => s.id === studentId) : undefined;
  const violations = selected
    ? await prisma.behaviorRecord.findMany({
        where: { schoolId: user.schoolId, studentId: selected.id, category: "مخالفة" },
        select: { id: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <main className="page">
      <h1>ملف الحالة</h1>
      <form method="GET" className="card no-print">
        <select name="student" defaultValue={selected?.id ?? ""} required>
          <option value="">اختر الطالب</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName} · {s.schoolClass?.name ?? ""}</option>
          ))}
        </select>
        <button type="submit">عرض الملف</button>
      </form>

      {selected && (
        <section className="card">
          <h2>{selected.fullName} · {selected.schoolClass?.name ?? "-"}</h2>
          {violations.length === 0 ? (
            <p>لا توجد مخالفات مسجّلة لهذا الطالب.</p>
          ) : (
            <ul className="list">
              {violations.map((v) => (
                <li key={v.id} className="card">
                  <strong>{v.description}</strong>
                  <small dir="ltr"> {v.createdAt.toISOString().slice(0, 10)}</small>
                  <p>الإجراءات الموصى بها:</p>
                  <ul>
                    {RECOMMENDED.map((r) => (
                      <li key={r.label}>
                        <strong>{r.label}</strong>: {r.note}
                        {r.href && (
                          <> · <a href={`/forms/${r.href}?student=${selected.id}`}>نموذج الإجراء</a></>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p>
            نماذج الإجراء: <a href={`/forms/oral-warning?student=${selected.id}`}>تنبيه شفهي</a> ·{" "}
            <a href={`/forms/behavior-pledge?student=${selected.id}`}>تعهد سلوكي</a> ·{" "}
            <a href={`/forms/guardian-notice?student=${selected.id}`}>إشعار ولي الأمر</a>
          </p>
        </section>
      )}
    </main>
  );
}
