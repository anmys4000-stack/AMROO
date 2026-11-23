import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../src/lib/db";
import { readSessionToken } from "../src/lib/session";

// الصفحة الرئيسية: إن لم توجد جلسة صالحة يُعاد التوجيه إلى تسجيل الدخول.
// وإن كان المستخدم يجب أن يغيّر كلمة المرور المؤقتة يُعاد توجيهه إلى صفحة التغيير.
export default async function HomePage() {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");

  const schoolId = user.schoolId;
  const [students, classes, teachers, guardians, presentToday] = await Promise.all([
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER", isActive: true } }),
    prisma.student.count({ where: { schoolId, isActive: true, guardianId: { not: null } } }),
    prisma.attendance.count({
      where: { schoolId, date: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"), status: "PRESENT" },
    }),
  ]);

  const cards = [
    { label: "الطلاب", value: students },
    { label: "الفصول", value: classes },
    { label: "المعلمون", value: teachers },
    { label: "أولياء الأمور المسجلون", value: guardians },
    { label: "الحضور اليوم", value: presentToday },
  ];

  return (
    <main className="page">
      <h1>لوحة التحكم</h1>
      <section className="grid">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p>{c.label}</p>
            <strong>{c.value}</strong>
          </div>
        ))}
      </section>
      <nav className="card">
        <a href="/students">الطلاب والمواظبة</a> · <a href="/timetable">الجدول الدراسي</a> ·{" "}
        <a href="/behavior">السلوك</a> · <a href="/import">استيراد البيانات</a>
      </nav>
    </main>
  );
}
