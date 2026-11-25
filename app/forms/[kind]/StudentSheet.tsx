import PrintButton from "../../violation-forms/PrintButton";

type Props = {
  kind: string;
  title: string;
  school: string;
  iso: string;
  student: { fullName: string; className: string; guardianName: string | null; guardianPhone: string | null };
  violation: { text: string; degree: string; date: string } | null;
};

const BLANK = "......................................";
const box = "▢";

// نماذج الطباعة للإجراءات السلوكية، مبنية على تخطيط النماذج الرسمية (الرأس، والجدول، والتوقيعات).
export default function StudentSheet({ kind, title, school, iso, student, violation }: Props) {
  const v = violation;
  const degree = v?.degree ?? BLANK;
  const violationText = v?.text ?? BLANK;
  const dateText = v?.date ?? BLANK;

  return (
    <section className="card sheet" dir="rtl">
      <header style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0d7c86", paddingBottom: 8 }}>
        <div>المملكة العربية السعودية<br />وزارة التعليم</div>
        <div style={{ textAlign: "center" }}>المنطقة/المحافظة: الإدارة العامة للتعليم<br />المدرسة: {school}</div>
      </header>
      <h2 style={{ textAlign: "center", margin: "14px 0" }}>{title}</h2>

      {kind === "oral-warning" && (
        <>
          <table className="table"><tbody>
            <tr><th>الاسم</th><td>{student.fullName}</td><th>الصف</th><td>{student.className}</td></tr>
            <tr><th>المخالفة</th><td colSpan={3}>{violationText}</td></tr>
            <tr><th>الدرجة</th><td>{degree}</td><th>تاريخ المخالفة</th><td dir="ltr">{dateText}</td></tr>
          </tbody></table>
          <p>تم تنبيه الطالب شفهيًا عن السلوك المخالف وأضراره المترتبة، وتوجيهه إلى السلوك الإيجابي البديل.</p>
          <p>{box} أُقِرّ أنا الطالب المذكور أعلاه بأنه قد جرى تنبيهي شفهيًا على المخالفة الموضحة، وأتعهد بعدم تكرارها والالتزام بقواعد السلوك والمواظبة.</p>
        </>
      )}

      {kind === "behavior-pledge" && (
        <>
          <p>أنا الطالب <strong>{student.fullName}</strong> بالصف <strong>{student.className}</strong></p>
          <p>أنني قمت في يوم ........ الموافق <span dir="ltr">{dateText}</span> بمشكلة سلوكية من الدرجة {degree}، وهي {violationText}.</p>
          <p>وأتعهد بعدم تكرار أي مشكلة سلوكية مستقبلًا، وعلى ذلك جرى التوقيع.</p>
        </>
      )}

      {kind === "guardian-notice" && (
        <>
          <p>المكرم ولي أمر الطالب: <strong>{student.guardianName ?? BLANK}</strong></p>
          <p>بالصف: <strong>{student.className}</strong></p>
          <p>السلام عليكم ورحمة الله وبركاته</p>
          <p>نشعركم بأن الطالب {student.fullName} قام بمشكلة سلوكية من الدرجة {degree}، وهي {violationText}.</p>
          <p>وقد قُرّرت الإجراءات التالية حياله وفق ما ورد في قواعد السلوك والمواظبة:</p>
          <ol>
            <li>التنبيه الشفهي وتوجيه الطالب إلى ضرورة الالتزام بالسلوك القويم.</li>
            <li>إشعار ولي الأمر بالواقعة (هذا الإشعار).</li>
          </ol>
          <p>لذا يرجى منكم المتابعة والتعاون مع المدرسة بما يسهم في انضباط سلوك ابنكم.</p>
        </>
      )}

      {kind === "guardian-invitation" && (
        <>
          <p>المكرم ولي أمر الطالب: <strong>{student.guardianName ?? BLANK}</strong></p>
          <p>بالصف: <strong>{student.className}</strong></p>
          <p>السلام عليكم ورحمة الله وبركاته</p>
          <p>نأمل منكم الحضور إلى المدرسة في يوم ........ الموافق ..... / ..... / 14هـ، لمقابلة وكيل شؤون الطلاب، وذلك بهدف: {violationText}.</p>
          <p>شاكرين لكم تعاونكم معنا لتحقيق مصلحة الطالب.</p>
          <p><strong>رد ولي الأمر:</strong></p>
          <p>{box} أُقِرّ بالعلم، وسأحضر في الموعد المحدد.</p>
          <p>{box} أُقِرّ بالعلم، وأرغب بتغيير الموعد (خلال نفس الأسبوع) في يوم ........ الموافق ..... / ..... / 14هـ.</p>
        </>
      )}

      {kind === "referral" && (
        <>
          <p>اسم الطالب: <strong>{student.fullName}</strong> · الصف: <strong>{student.className}</strong> · التاريخ: <span dir="ltr">{iso}</span></p>
          <p><strong>سبب التحويل:</strong></p>
          <p>{box} عدم أداء الواجب &nbsp; {box} ضعف دراسي &nbsp; {box} مشاغبة &nbsp; {box} تأخر عن الحصة &nbsp; {box} أخرى</p>
          <p><strong>إيضاح المشكلة:</strong> {violationText}</p>
          <p><strong>الإجراء الذي اتخذه المُحيل قبل التحويل:</strong> ______________________________________________</p>
          <p><strong>إجراء وكيل شؤون الطلاب (المستلم):</strong> ______________________________________________</p>
        </>
      )}

      {kind === "committee-minutes" && (
        <>
          <p><strong>عناصر الاجتماع:</strong> مناقشة الحالة السلوكية للطالب {student.fullName} وتحديد الإجراء التربوي المناسب.</p>
          <p><strong>وصف المشكلة السلوكية:</strong> {violationText}</p>
          <p><strong>تصنيف المشكلة السلوكية درجة ونوعًا:</strong> الدرجة {degree}</p>
          <p><strong>قرارات اللجنة:</strong></p>
          <p>........................................................................................................</p>
          <table className="table"><thead><tr><th>م</th><th>اسم العضو المشارك</th><th>الوظيفة</th><th>العمل المسند إليه</th><th>التوقيع</th></tr></thead><tbody>
            <tr><td>1</td><td></td><td>رئيس</td><td>وكيل المدرسة لشؤون الطلبة</td><td></td></tr>
            <tr><td>2</td><td></td><td>عضو</td><td>وكيل المدرسة للشؤون التعليمية</td><td></td></tr>
            <tr><td>3</td><td></td><td>مقرر</td><td>الموجه الطلابي</td><td></td></tr>
            <tr><td>4</td><td></td><td>عضو</td><td>معلم متميز</td><td></td></tr>
            <tr><td>5</td><td></td><td>عضو</td><td>معلم متميز</td><td></td></tr>
            <tr><td>6</td><td></td><td>عضو</td><td>معلم متميز</td><td></td></tr>
          </tbody></table>
        </>
      )}

      {kind === "attendance-pledge" && (
        <>
          <table className="table"><tbody>
            <tr><th>اسم الطالب</th><td>{student.fullName}</td></tr>
            <tr><th>الصف</th><td>{student.className}</td></tr>
          </tbody></table>
          <p>أتعهد بالالتزام بالحضور المنتظم إلى المدرسة في المواعيد المحددة، وبمتابعة ولي الأمر لذلك.</p>
        </>
      )}

      {!["oral-warning", "behavior-pledge", "guardian-notice", "guardian-invitation", "referral", "committee-minutes", "attendance-pledge"].includes(kind) && (
        <>
          <p>اسم الطالب: {student.fullName} · الفصل: {student.className}</p>
          <p>السيد/ولي أمر الطالب: {student.guardianName ?? BLANK} · <span dir="ltr">{student.guardianPhone ?? ""}</span></p>
          <p>المخالفة / السبب: {violationText}</p>
          <p>الإجراء / الموعد: ______________________________________________</p>
        </>
      )}

      <table className="table" style={{ marginTop: 24 }}>
        <tbody>
          <tr>
            <td>وكيل شؤون الطلاب<br />الاسم: أحمد ناصر صالح<br />التوقيع: ..................<br />التاريخ: <span dir="ltr">{iso}</span></td>
            <td>ولي الأمر<br />الاسم: {student.guardianName ?? ".................."}<br />التوقيع: ..................</td>
            <td>الطالب<br />الاسم: {student.fullName}<br />التوقيع: ..................</td>
          </tr>
        </tbody>
      </table>
      <PrintButton />
    </section>
  );
}
