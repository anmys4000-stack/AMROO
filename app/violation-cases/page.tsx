import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// ملف الحالة: الإجراء التصاعدي حسب درجة المخالفة وعدد تكرارها، كما في دليل مسار
// (دليل الإجراءات التربوية التصاعدية). كل مرحلة تنطبق من رقم التكرار المذكور وما بعده.
type Stage = { from: number; label: string; steps: string[] };
const ESCALATION: Record<string, { points: number; stages: Stage[] }> = {
  "الدرجة الأولى": { points: 1, stages: [
    { from: 1, label: "عند التكرار الأول", steps: ["تنبيه شفهي: التنبيه الشفهي الأول من المعلم أو إدارة المدرسة عن السلوك وأضراره، بأسلوب تربوي حكيم"] },
    { from: 2, label: "عند التكرار الثاني", steps: ["تنبيه شفهي: التنبيه الشفهي الثاني عند مباشرة الموقف", "متابعة: ملاحظة الطالب وحصر السلوكيات السلبية والإيجابية ومسبباتها، والبدء بالحد من مسببات السلوك السلبي وتعزيز الإيجابي"] },
    { from: 3, label: "عند التكرار الثالث", steps: ["توثيق: تدوين المشكلة من المعلم المباشر في سجل المشكلات السلوكية وتوقيع الطالب عليها", "إشعار ولي الأمر هاتفيًا بمشكلة الطالب السلوكية", "حسم درجة من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "التوجيه الطلابي: تحويل الطالب إلى الموجه الطلابي لدراسة حالته"] },
    { from: 4, label: "عند التكرار الرابع فأكثر", steps: ["استدعاء ولي الأمر: دعوته وإخطاره بالسلوك، والاتفاق على خطة لتعديله يقوم بها الموجه الطلابي", "حسم درجة من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "لجنة التوجيه: تحويل الطالب إلى لجنة التوجيه الطلابي لبحث أسباب عدم استجابته", "متابعة الموجه الطلابي لحالته لتقديم الخدمات التربوية"] },
  ] },
  "الدرجة الثانية": { points: 2, stages: [
    { from: 1, label: "عند التكرار الأول", steps: ["إشعار ولي الأمر هاتفيًا بالمشكلة والإجراءات المتخذة", "حسم درجتين من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "تعهد خطي: أخذ تعهد على الطالب بعدم تكرار المخالفة", "التوجيه الطلابي: تحويل الطالب إلى الموجه الطلابي لدراسة حالته"] },
    { from: 2, label: "عند التكرار الثاني", steps: ["جميع ما ذُكر في الإجراء الأول", "دعوة ولي الأمر حضوريًا ومناقشته في خطة تعديل السلوك، ووضع برنامج وقائي مشترك وتوقيع ولي الأمر", "متابعة الموجه الطلابي لتقديم الخدمات التربوية"] },
    { from: 3, label: "عند التكرار الثالث فأكثر", steps: ["جميع ما ذُكر في الإجراء الثاني", "نقل الطالب إلى فصل آخر وفقًا لقرار لجنة التوجيه الطلابي في المدرسة", "لجنة التوجيه: تحويل المخالف إلى لجنة التوجيه الطلابي لوضع الحلول وفق تقرير الموجه الطلابي"] },
  ] },
  "الدرجة الثالثة": { points: 3, stages: [
    { from: 1, label: "عند التكرار الأول", steps: ["استدعاء ولي الأمر: دعوته وتوضيح ما يترتب على التكرار، ووضع برنامج وقائي، وتعهد خطي موقع من ولي الأمر", "حسم ثلاث درجات من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "اعتذار لمن أساء إليهم", "إصلاح ما أتلفه الطالب أو إحضار بديل عنه", "مصادرة الممنوعات وإتلافها من لجنة التوجيه، وإعداد محضر بذلك", "التوجيه الطلابي: تحويل الطالب إلى الموجه الطلابي لدراسة حالته"] },
    { from: 2, label: "عند التكرار الثاني", steps: ["جميع ما ورد في الإجراء الأول", "استدعاء ولي الأمر وإنذار الطالب كتابيًا بالنقل إلى مدرسة أخرى في حال تكرار المخالفة، وتوقيع ولي الأمر"] },
    { from: 3, label: "عند التكرار الثالث فأكثر", steps: ["جميع ما ورد في الإجراء الأول", "إدارة التعليم: ترفع المدرسة رسميًا وبصفة عاجلة محضر لجنة التوجيه بخصوص القضية", "إدارة التعليم: يصدر مدير التعليم قرارًا بنقل الطالب إلى مدرسة أخرى مع الأخذ برأي ولي الأمر، واستمراره بالدراسة حتى النقل", "متابعة الموجه الطلابي في المدرسة المنقول إليها الطالب"] },
  ] },
  "الدرجة الرابعة": { points: 10, stages: [
    { from: 1, label: "عند التكرار الأول", steps: ["استدعاء ولي الأمر: دعوته وإنذاره بالنقل في حال التكرار، ووضع برنامج وقائي، وتعهد خطي موقع من ولي الأمر", "حسم عشر درجات من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "اعتذار لمن أساء إليهم", "إصلاح ما أتلفه الطالب أو إحضار بديل عنه وإشعار ولي الأمر", "مصادرة الممنوعات وإتلافها، وإعداد محضر بذلك من لجنة التوجيه", "نقل الطالب إلى فصل آخر وفقًا لقرار لجنة التوجيه", "متابعة الموجه الطلابي لتقديم الخدمات التربوية", "إحالة من إدارة المدرسة إلى لجنة التوجيه الطلابي بعد حدوث المشكلة مباشرة"] },
    { from: 2, label: "عند التكرار الثاني فأكثر", steps: ["جميع ما ورد في الإجراء الأول باستثناء نقل الطالب من الفصل", "توثيق: رفع محضر اجتماع لجنة التوجيه إلى إدارة التعليم بصفة عاجلة", "نقل الطالب: قرار من مدير التعليم بنقله إلى مدرسة أخرى مع الأخذ برأي ولي الأمر", "إشعار ولي الأمر وتمكين الطالب من فرص التعويض في المدرسة المنقول إليها", "متابعة الموجه الطلابي في المدرسة المنقول إليها"] },
  ] },
  "الدرجة الخامسة": { points: 15, stages: [
    { from: 1, label: "عند التكرار الأول", steps: ["استدعاء ولي الأمر: دعوته وإخطاره بمشكلة الطالب والإجراءات المترتبة عليها", "حسم خمس عشرة درجة من السلوك الإيجابي مع فرص التعويض وإشعار ولي الأمر", "لجنة التوجيه: اجتماع لجنة التوجيه الطلابي في المدرسة بعد وقوع القضية مباشرة", "متابعة الموجه الطلابي وتقديم الخدمات التربوية"] },
    { from: 2, label: "عند التكرار الثاني فأكثر", steps: ["توثيق: رفع محضر اجتماع لجنة التوجيه إلى إدارة التعليم بصفة عاجلة", "نقل الطالب: قرار من مدير التعليم بنقله إلى مدرسة أخرى مع الأخذ برأي ولي الأمر", "متابعة الموجه الطلابي في المدرسة المنقول إليها"] },
  ] },
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
  const all = selected
    ? await prisma.behaviorRecord.findMany({
        where: { schoolId: user.schoolId, studentId: selected.id, category: "مخالفة" },
        select: { id: true, description: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  // رقم التكرار: ترتيب المخالفة بين مخالفات الطالب من الدرجة نفسها، من الأقدم إلى الأحدث.
  const repMap = new Map<string, number>();
  const seen: Record<string, number> = {};
  for (const r of all) {
    const d = Object.keys(ESCALATION).find((k) => r.description.includes(k)) ?? "";
    seen[d] = (seen[d] ?? 0) + 1;
    repMap.set(r.id, seen[d]);
  }
  const repetitionOf = (id: string) => repMap.get(id) ?? 1;
  const violations = [...all].reverse();

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
                    const degree = Object.keys(ESCALATION).find((d) => v.description.includes(d));
                    if (!degree) return <p>لم تُحدَّد الدرجة في هذه المخالفة، فلا يوجد إجراء تصاعدي محدد.</p>;
                    const rep = repetitionOf(v.id);
                    const stage = [...ESCALATION[degree].stages].reverse().find((st) => rep >= st.from);
                    return (
                      <div>
                        <p>{degree} · حسم {ESCALATION[degree].points} درجات · التكرار رقم {rep}</p>
                        {stage && (
                          <>
                            <strong>{stage.label}</strong>
                            <ul>{stage.steps.map((x) => <li key={x}>{x}</li>)}</ul>
                          </>
                        )}
                      </div>
                    );
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
