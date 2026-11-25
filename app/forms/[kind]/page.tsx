import { notFound } from "next/navigation";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";
import PrintButton from "../../violation-forms/PrintButton";
import StudentSheet from "./StudentSheet";

const TITLES: Record<string, string> = {
  representatives: "كشف رواد الفصول",
  learning: "كشف حالات صعوبات التعلم",
  speech: "كشف حالات صعوبات النطق",
  absence: "كشف الغياب اليومي",
  leave: "كشف حضور وانصراف المستأذنين",
  staff: "كشف المعلمين والإداريين",
  "oral-warning": "تنبيه شفهي",
  "behavior-pledge": "تعهد سلوكي",
  "guardian-notice": "إشعار ولي الأمر بمشكلة سلوكية",
  "guardian-invitation": "خطاب دعوة ولي الأمر",
  "incident-record": "محضر ضبط واقعة",
  "committee-minutes": "محضر اجتماع لجنة التوجيه الطلابي",
  "abuse-report": "نموذج إبلاغ عن حالة إيذاء",
  "high-risk-report": "نموذج إبلاغ عن حالة عالية الخطورة",
  "behavior-plan": "نموذج خطة تعديل السلوك",
  "absence-excused": "نموذج إجراء الغياب بعذر",
  "absence-unexcused": "نموذج إجراء الغياب بدون عذر",
  "positive-behavior-record": "نموذج رصد درجات السلوك المتميز",
  "compensation-chances": "نموذج فرص تعويض درجات السلوك الإيجابي",
  referral: "نموذج تحويل طالب لوكيل شؤون الطلاب",
  "attendance-pledge": "تعهد الالتزام بالحضور",
};

const STUDENT_FORMS = new Set(["oral-warning", "behavior-pledge", "guardian-notice", "guardian-invitation", "incident-record", "abuse-report", "high-risk-report", "behavior-plan", "absence-excused", "absence-unexcused", "positive-behavior-record", "compensation-chances", "referral", "attendance-pledge"]);

const BODY: Record<string, string> = {
  "oral-warning": "نفيد بأن الطالب المذكور أعلاه قد تلقى تنبيهًا شفهيًا بسبب المخالفة الموضحة أدناه، ونأمل الالتزام بالسلوك المدرسي.",
  "behavior-pledge": "أتعهد أنا الطالب المذكور أعلاه بالالتزام بالأنظمة واللوائح المدرسية، وبعدم تكرار المخالفة الموضحة أدناه، وأتحمل مسؤولية ذلك.",
  "guardian-notice": "نحيط ولي أمر الطالب المذكور أعلاه علمًا بوقوع المشكلة السلوكية الموضحة أدناه، ونرجو المتابعة والتعاون مع المدرسة.",
  "behavior-plan": "نضع هذه الخطة لتعديل السلوك غير المرغوب فيه للطالب المذكور أعلاه، وقد حُدّدت فيها المشكلة وأسبابها وإجراءاتها ومتابعتها بالتعاون مع ولي الأمر.",
  "absence-excused": "نفيد بأن الطالب المذكور أعلاه تغيّب بعذر مقبول، وقد اتخذت الإجراءات المبينة أدناه وفق لائحة المواظبة المعتمدة.",
  "absence-unexcused": "نفيد بأن الطالب المذكور أعلاه تغيّب بدون عذر، وقد اتخذت الإجراءات المبينة أدناه وفق لائحة المواظبة المعتمدة، ونرجو تعاونكم.",
  "positive-behavior-record": "نسجّل فيما يلي الدرجات المكتسبة للطالب المذكور أعلاه في السلوك الإيجابي المتميز، مع شواهد التنفيذ.",
  "compensation-chances": "نمنح الطالب المذكور أعلاه فرصة لتعويض ما حُسم من درجات السلوك الإيجابي وفق الأنشطة المبينة أدناه، ونشعر ولي أمره بذلك.",
  "incident-record": "نثبت بهذا المحضر وقوع الواقعة السلوكية الموضحة أدناه، وقد تم ضبطها وتوثيق أطرافها وفق الإجراءات المعتمدة.",
  "committee-minutes": "عقدت لجنة التوجيه الطلابي اجتماعها لدراسة حالة الطالب المذكور أعلاه، واتخذت القرارات الموضحة أدناه.",
  "abuse-report": "نبلغ عن اشتباه بحالة إيذاء تعرّض لها أو يتعرض لها الطالب المذكور أعلاه، وفق الإجراءات المعتمدة، لاتخاذ اللازم.",
  "high-risk-report": "نبلغ عن حالة عالية الخطورة تخص الطالب المذكور أعلاه، لاتخاذ الإجراء العاجل وفق التعليمات المعتمدة.",
  "guardian-invitation": "يسرنا دعوتكم لحضور المدرسة لمناقشة وضع الطالب المذكور أعلاه، في الموعد المحدد أدناه، لمتابعة سلوكه ومستواه.",
};

// نماذج مطبوعة تُعبّأ من البيانات الموجودة، مع حقول فارغة للتوقيع والملاحظات.
export default async function PrintableFormPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ date?: string; student?: string }> }) {
  const { kind } = await params;
  const title = TITLES[kind];
  if (!title) notFound();
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض هذا النموذج.</p>
      </main>
    );
  }
  const { date: rawDate, student: studentId } = await searchParams;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : new Date().toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  const sid = user.schoolId;

  if (STUDENT_FORMS.has(kind)) {
    const students = await prisma.student.findMany({
      where: { schoolId: sid, isActive: true },
      select: { id: true, fullName: true, guardianName: true, guardianPhone: true, schoolClass: { select: { name: true } } },
      orderBy: { fullName: "asc" },
      take: 800,
    });
    const s = studentId ? students.find((x) => x.id === studentId) : undefined;
    const school = await prisma.school.findUnique({ where: { id: sid }, select: { name: true } });
    const rec = s
      ? await prisma.behaviorRecord.findFirst({
          where: { schoolId: sid, studentId: s.id, category: "مخالفة" },
          orderBy: { createdAt: "desc" },
          select: { description: true, createdAt: true },
        })
      : null;
    const latestViolation = rec
      ? {
          text: rec.description.replace(/\(الدرجة[^)]*\).*$/, "").trim(),
          degree: (rec.description.match(/\(([^)]*الدرجة[^)]*)\)/)?.[1]) ?? "",
          date: rec.createdAt.toISOString().slice(0, 10),
        }
      : null;
    return (
      <main className="page">
        <h1>{title}</h1>
        <form method="GET" className="card no-print">
          <select name="student" defaultValue={s?.id ?? ""} required>
            <option value="">اختر الطالب</option>
            {students.map((x) => (
              <option key={x.id} value={x.id}>{x.fullName} · {x.schoolClass?.name ?? ""}</option>
            ))}
          </select>
          <input type="date" name="date" dir="ltr" defaultValue={iso} />
          <button type="submit">عرض النموذج</button>
        </form>
        {s && (
          <StudentSheet
            kind={kind}
            title={title}
            school={school?.name ?? ""}
            iso={iso}
            student={{ fullName: s.fullName, className: s.schoolClass?.name ?? "-", guardianName: s.guardianName, guardianPhone: s.guardianPhone }}
            violation={latestViolation}
          />
        )}
      </main>
    );
  }

  let body: React.ReactNode;
  if (kind === "representatives") {
    const classes = await prisma.schoolClass.findMany({ where: { schoolId: sid }, orderBy: { name: "asc" }, select: { name: true, homeroomLeaderId: true } });
    const leaders = await prisma.user.findMany({ where: { schoolId: sid, id: { in: classes.map((c) => c.homeroomLeaderId).filter((x): x is string => !!x) } }, select: { id: true, fullName: true } });
    const byId = new Map(leaders.map((l) => [l.id, l.fullName]));
    body = (
      <table className="table">
        <thead><tr><th>الفصل</th><th>الرائد</th><th>التوقيع</th></tr></thead>
        <tbody>{classes.map((c) => <tr key={c.name}><td>{c.name}</td><td>{c.homeroomLeaderId ? byId.get(c.homeroomLeaderId) ?? "" : ""}</td><td></td></tr>)}</tbody>
      </table>
    );
  } else if (kind === "learning" || kind === "speech") {
    const cases = await prisma.learningCase.findMany({
      where: { schoolId: sid, kind: kind === "learning" ? "LEARNING" : "SPEECH" },
      orderBy: { createdAt: "asc" },
      select: { description: true, open: true, student: { select: { fullName: true, schoolClass: { select: { name: true } } } } },
    });
    body = (
      <table className="table">
        <thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>الوصف</th><th>الحالة</th></tr></thead>
        <tbody>{cases.map((c, i) => <tr key={i}><td>{i + 1}</td><td>{c.student.fullName}</td><td>{c.student.schoolClass?.name ?? ""}</td><td>{c.description}</td><td>{c.open ? "مفتوحة" : "مغلقة"}</td></tr>)}</tbody>
      </table>
    );
  } else if (kind === "absence") {
    const rows = await prisma.attendance.findMany({
      where: { schoolId: sid, date, status: { in: ["ABSENT", "LATE"] } },
      select: { status: true, student: { select: { fullName: true, schoolClass: { select: { name: true } } } } },
      orderBy: { student: { fullName: "asc" } },
    });
    body = (
      <table className="table">
        <thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>الحالة</th><th>ملاحظة</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.student.fullName}</td><td>{r.student.schoolClass?.name ?? ""}</td><td>{r.status === "ABSENT" ? "غائب" : "متأخر"}</td><td></td></tr>)}</tbody>
      </table>
    );
  } else if (kind === "leave") {
    const leaves = await prisma.leaveRequest.findMany({
      where: { schoolId: sid, date, status: "APPROVED" },
      select: { leaveAt: true, returnAt: true, reason: true, teacher: { select: { fullName: true } } },
      orderBy: { leaveAt: "asc" },
    });
    body = (
      <table className="table">
        <thead><tr><th>#</th><th>المعلم</th><th>وقت الخروج</th><th>وقت العودة</th><th>السبب</th><th>التوقيع</th></tr></thead>
        <tbody>{leaves.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.teacher.fullName}</td><td dir="ltr">{l.leaveAt}</td><td dir="ltr">{l.returnAt}</td><td>{l.reason}</td><td></td></tr>)}</tbody>
      </table>
    );
  } else {
    const staff = await prisma.user.findMany({ where: { schoolId: sid, isActive: true }, select: { fullName: true, role: true }, orderBy: { fullName: "asc" } });
    body = (
      <table className="table">
        <thead><tr><th>#</th><th>الاسم</th><th>الدور</th><th>التوقيع</th></tr></thead>
        <tbody>{staff.map((s, i) => <tr key={i}><td>{i + 1}</td><td>{s.fullName}</td><td>{s.role}</td><td></td></tr>)}</tbody>
      </table>
    );
  }

  return (
    <main className="page">
      <h1>{title}</h1>
      {(kind === "absence" || kind === "leave") && <p>التاريخ: <span dir="ltr">{iso}</span></p>}
      <PrintButton />
      <section className="card sheet">{body}</section>
    </main>
  );
}
