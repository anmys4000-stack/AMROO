import { notFound } from "next/navigation";
import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";

const STATUS_LABELS: Record<string, string> = { PRESENT: "حاضر", ABSENT: "غائب", LATE: "متأخر", EXCUSED: "بعذر" };

// الملف الشامل للطالب: بياناته، وسلوكه، وغيابه، وأعذاره، والإحالات، والرسائل.
export default async function StudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض ملف الطالب.</p>
      </main>
    );
  }

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      schoolId: true,
      fullName: true,
      guardianName: true,
      guardianPhone: true,
      schoolClass: { select: { name: true } },
      behaviors: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, category: true, description: true, createdAt: true } },
      attendance: { orderBy: { date: "desc" }, take: 60, select: { id: true, date: true, status: true } },
      excuses: { orderBy: { date: "desc" }, take: 30, select: { id: true, date: true, reason: true, status: true } },
    },
  });
  if (!student || student.schoolId !== user.schoolId) notFound();

  const messagesCount = await prisma.message.count({ where: { studentId: id } });

  return (
    <main className="page">
      <h1>{student.fullName}</h1>
      <section className="card">
        <p>الفصل: {student.schoolClass?.name ?? "بدون فصل"}</p>
        <p>ولي الأمر: {student.guardianName ?? "غير مسجل"}</p>
        <p dir="ltr">{student.guardianPhone ?? ""}</p>
        <p>عدد الرسائل المرسلة لولي الأمر: {messagesCount}</p>
      </section>

      <section className="card">
        <h2>السلوك</h2>
        {student.behaviors.length === 0 ? (
          <p>لا توجد سجلات سلوك.</p>
        ) : (
          <ul className="list">
            {student.behaviors.map((b) => (
              <li key={b.id} className="row">
                <span>
                  {b.category}: {b.description}
                </span>
                <span dir="ltr">{b.createdAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>الغياب الأخير</h2>
        {student.attendance.length === 0 ? (
          <p>لا يوجد سجل حضور.</p>
        ) : (
          <ul className="list">
            {student.attendance.map((a) => (
              <li key={a.id} className="row">
                <span dir="ltr">{a.date.toISOString().slice(0, 10)}</span>
                <span>{STATUS_LABELS[a.status] ?? a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>الأعذار</h2>
        {student.excuses.length === 0 ? (
          <p>لا توجد أعذار.</p>
        ) : (
          <ul className="list">
            {student.excuses.map((e) => (
              <li key={e.id} className="row">
                <span dir="ltr">{e.date.toISOString().slice(0, 10)}</span>
                <span>{e.reason}</span>
                <span>{e.status === "APPROVED" ? "معتمد" : e.status === "REJECTED" ? "مرفوض" : "قيد المراجعة"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
