import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// ملف الحالة: مخالفات الطالب مع الإجراءات التربوية حسب الدرجة، كما في دليل وزارة التعليم
// (الإجراء التربوي العلاجي لتعديل السلوك) ونموذج مسار. ينفّذ كل إجراء بالترتيب.
type Stage = { stage: string; steps: string[] };
const LADDERS: Record<string, Stage[]> = {
  "الدرجة الأولى": [
    { stage: "الإجراء الأول", steps: ["التنبيه الشفهي"] },
    { stage: "الإجراء الثاني", steps: [
      "التنبيه الشفهي الثاني",
      "ملاحظة الطالب وحصر السلوكيات السلبية والإيجابية وسبب حدوثها",
      "تدوين المشكلة من المعلم المباشر في سجل المشكلات السلوكية",
      "إشعار ولي الأمر هاتفيًا بمشكلة الطالب السلوكية",
      "حسم درجة من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر بذلك",
      "بعد تنفيذ الإجراء تحويل الطالب إلى الموجه الطلابي لدراسة حالته",
      "دعوة ولي الأمر ومناقشته في خطة تعديل السلوك",
      "متابعة حالة الطالب من قبل الموجه الطلابي لتقديم الخدمات التربوية",
    ] },
  ],
  "الدرجة الثانية": [
    { stage: "الإجراء الأول", steps: [
      "إشعار ولي الأمر بالمشكلة السلوكية والإجراءات المتخذة",
      "حسم درجتين من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر",
      "الاعتذار لمن أساء إليهم",
      "إصلاح ما أتلفه الطالب أو إحضار بديل عنه",
      "تحويل الطالب إلى الموجه الطلابي لدراسة حالته",
    ] },
    { stage: "الإجراء الثاني", steps: [
      "جميع ما ذُكر في الإجراء الأول مع تغيير إجراءات خطة تعديل السلوك",
      "دعوة ولي الأمر ومناقشته في خطة تعديل السلوك ووضع برنامج وقائي، وأخذ تعهد خطي على الطالب وتوقيع ولي الأمر",
      "متابعة حالة الطالب من قبل الموجه الطلابي لتقديم الخدمات التربوية",
    ] },
    { stage: "الإجراء الثالث", steps: [
      "جميع ما ذُكر في الإجراء الثاني مع تغيير إجراءات خطة تعديل السلوك",
      "تحويل الطالب إلى لجنة التوجيه الطلابي لبحث أسباب عدم استجابته وإيجاد الحلول المناسبة",
      "نقل الطالب إلى فصل آخر وفقًا لقرار لجنة التوجيه الطلابي",
    ] },
  ],
  "الدرجة الثالثة": [
    { stage: "الإجراء الأول", steps: [
      "دعوة ولي الأمر ومناقشته في خطة تعديل السلوك ووضع برنامج وقائي مشترك، وأخذ تعهد خطي وتوقيع ولي الأمر",
      "حسم ثلاث درجات من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر",
      "الاعتذار لمن أساء إليهم، وإصلاح ما أتلفه الطالب",
      "مصادرة الممنوعات وإتلافها من لجنة التوجيه الطلابي وإعداد محضر بذلك",
      "تحويل الطالب إلى الموجه الطلابي لدراسة حالته",
    ] },
    { stage: "الإجراء الثاني", steps: [
      "جميع ما ذُكر في الإجراء الأول مع تغيير إجراءات خطة تعديل السلوك",
      "نقل الطالب إلى فصل آخر وفقًا لقرار لجنة التوجيه الطلابي",
      "متابعة حالة الطالب من قبل الموجه الطلابي لتقديم الخدمات التربوية",
    ] },
    { stage: "الإجراء الثالث", steps: [
      "ترفع إدارة المدرسة محضرًا عاجلًا لإدارة التعليم بخصوص لجنة التوجيه",
      "يصدر مدير التعليم قرارًا بنقل الطالب إلى مدرسة أخرى مع استمراره بالدراسة حتى النقل",
      "إحالة الطالب إلى الموجه الطلابي في المدرسة المنقول إليها لتقديم برنامج تربوي يشتمل على جلسات في تعديل السلوك",
      "يكتب تعهد خطي من الطالب ويحضر ولي الأمر بالالتزام بالانضباط والسلوك الحسن بعد استكمال البرنامج",
      "متابعة الحالة من الموجه الطلابي في المدرسة المنقول إليها",
    ] },
  ],
  "الدرجة الرابعة": [
    { stage: "الإجراء الأول", steps: [
      "دعوة ولي الأمر ومناقشته في خطة تعديل السلوك، وأخذ تعهد خطي وتوقيع ولي الأمر",
      "حسم عشر درجات من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر",
      "الاعتذار لمن أساء إليهم",
      "تحويل الطالب إلى الموجه الطلابي لدراسة حالته",
      "ترفع إدارة المدرسة محضرًا عاجلًا لإدارة التعليم بخصوص لجنة التوجيه",
      "يصدر مدير التعليم قرارًا بنقل الطالب إلى مدرسة أخرى مع استمراره بالدراسة حتى النقل",
      "إحالة الطالب إلى الموجه الطلابي في المدرسة المنقول إليها لتقديم برنامج تربوي",
      "يكتب تعهد خطي من الطالب ويحضر ولي الأمر بالالتزام بالانضباط بعد استكمال البرنامج",
      "متابعة الحالة من الموجه الطلابي لتقديم الخدمات التربوية",
    ] },
  ],
};

const FORM_LINKS = [
  { href: "oral-warning", label: "تنبيه شفهي" },
  { href: "behavior-pledge", label: "تعهد سلوكي" },
  { href: "guardian-notice", label: "إشعار ولي الأمر" },
  { href: "guardian-invitation", label: "خطاب دعوة ولي الأمر" },
  { href: "behavior-plan", label: "خطة تعديل السلوك" },
  { href: "incident-record", label: "محضر ضبط واقعة" },
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
                  {(() => {
                    const degree = Object.keys(LADDERS).find((d) => v.description.includes(d));
                    if (!degree) return <p>لم تُحدَّد الدرجة في هذه المخالفة، فلا توجد إجراءات محددة.</p>;
                    return LADDERS[degree].map((st) => (
                      <div key={st.stage}>
                        <strong>{st.stage}</strong>
                        <ul>{st.steps.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    ));
                  })()}
                </li>
              ))}
            </ul>
          )}
          <p>
            نماذج الإجراء:{" "}
            {FORM_LINKS.map((f, i) => (
              <span key={f.href}>
                {i > 0 && " · "}
                <a href={`/forms/${f.href}?student=${selected.id}`}>{f.label}</a>
              </span>
            ))}
          </p>
        </section>
      )}
    </main>
  );
}
