import { notFound } from "next/navigation";
import { prisma } from "../../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../../src/lib/auth";
import PrintButton from "../../../violation-forms/PrintButton";

// طباعة مخالفة واحدة: بيانات الطالب والمخالفة والإجراء المتخذ حسب الدرجة والتكرار.
const DEGREE_KEYS = ["الدرجة الأولى", "الدرجة الثانية", "الدرجة الثالثة", "الدرجة الرابعة", "الدرجة الخامسة"];

export default async function PrintViolationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "behavior:record")) notFound();
  const { id } = await params;

  const record = await prisma.behaviorRecord.findFirst({
    where: { id, schoolId: user.schoolId, category: "مخالفة" },
    select: {
      description: true,
      createdAt: true,
      recordedBy: true,
      student: { select: { id: true, fullName: true, schoolClass: { select: { name: true } } } },
    },
  });
  if (!record) notFound();

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } });
  const degree = DEGREE_KEYS.find((k) => record.description.includes(k));
  // رقم التكرار: ترتيب المخالفة بين مخالفات الطالب من الدرجة نفسها.
  const sameDegree = degree
    ? await prisma.behaviorRecord.count({
        where: {
          schoolId: user.schoolId,
          studentId: record.student.id,
          category: "مخالفة",
          description: { contains: degree },
          createdAt: { lte: record.createdAt },
        },
      })
    : 0;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#111" }}>
      <div className="no-print" style={{ marginBottom: 12 }}><PrintButton /></div>
      <h1 style={{ textAlign: "center", fontSize: 22 }}>{school?.name ?? "المدرسة"}</h1>
      <h2 style={{ textAlign: "center", fontSize: 18 }}>محضر تسجيل مخالفة سلوكية</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <tbody>
          <tr><th style={cell}>اسم الطالب</th><td style={cell}>{record.student.fullName}</td></tr>
          <tr><th style={cell}>الفصل</th><td style={cell}>{record.student.schoolClass?.name ?? "-"}</td></tr>
          <tr><th style={cell}>تاريخ المخالفة</th><td style={cell} dir="ltr">{record.createdAt.toISOString().slice(0, 10)}</td></tr>
          <tr><th style={cell}>المخالفة</th><td style={cell}>{record.description}</td></tr>
          <tr><th style={cell}>الدرجة</th><td style={cell}>{degree ?? "غير محددة"}</td></tr>
          <tr><th style={cell}>رقم التكرار</th><td style={cell}>{degree ? sameDegree : "-"}</td></tr>
          <tr><th style={cell}>سجّلها</th><td style={cell}>{record.recordedBy ?? "-"}</td></tr>
        </tbody>
      </table>
      <p style={{ marginTop: 24, fontSize: 13 }}>
        يُطبَّق الإجراء التربوي حسب دليل الإجراءات التصاعدية، وتُراجع تفاصيله في ملف الحالة داخل النظام.
      </p>
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 40 }}>
        <span>توقيع وكيل شؤون الطلاب: ........................</span>
        <span>توقيع مدير المدرسة: ........................</span>
      </div>
    </main>
  );
}

const cell = { border: "1px solid #999", padding: "8px 10px", textAlign: "right" as const, verticalAlign: "top" as const };
