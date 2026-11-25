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

  // المعلم يرى جدوله الشخصي: الحصص المرتبطة بحسابه، أو بتطابق اسمه المكتوب في الجدول.
  if (user.role === "TEACHER") {
    const lessons = await prisma.timetableEntry.findMany({
      where: {
        schoolId: user.schoolId,
        OR: [{ teacherId: user.id }, { teacherName: user.fullName }],
      },
      select: { weekday: true, period: true, subject: true, schoolClass: { select: { name: true } } },
      orderBy: [{ weekday: "asc" }, { period: "asc" }],
    });
    const days = ["", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
    const periods = [1, 2, 3, 4, 5, 6, 7];
    const byCell = new Map(lessons.map((l) => [`${l.weekday}-${l.period}`, l]));
    // اليوم بتوقيت الرياض: الأحد = 0 في JS، والأحد = 1 في الجدول.
    const riyadhNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const todayIndex = riyadhNow.getDay() + 1;
    const todayLessons = lessons.filter((l) => l.weekday === todayIndex);

    return (
      <main className="page teacher-home">
        <header className="teacher-header">
          <p className="muted">أهلًا بك</p>
          <h1>{user.fullName}</h1>
        </header>

        <section className="card">
          <h2>حصص اليوم</h2>
          {todayLessons.length === 0 ? (
            <p className="muted">لا توجد حصص لك اليوم.</p>
          ) : (
            <ul className="list">
              {todayLessons.map((l) => (
                <li key={`${l.weekday}-${l.period}-${l.schoolClass.name}`} className="row">
                  <strong>الحصة {l.period}</strong>
                  <span>
                    {l.subject} · {l.schoolClass.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>جدولي الأسبوعي</h2>
          {lessons.length === 0 ? (
            <p className="muted">لا توجد حصص مرتبطة بحسابك بعد. اطلب من الإدارة ربط جدولك.</p>
          ) : (
            <div className="week-grid" role="table">
              <div role="row" className="week-head">
                <div role="columnheader">الحصة</div>
                {days.slice(1).map((d) => (
                  <div role="columnheader" key={d}>
                    {d}
                  </div>
                ))}
              </div>
              {periods.map((p) => (
                <div role="row" key={p} className="week-row">
                  <div role="cell" className="period">
                    {p}
                  </div>
                  {[1, 2, 3, 4, 5].map((wd) => {
                    const l = byCell.get(`${wd}-${p}`);
                    return (
                      <div role="cell" key={wd} className={l ? "lesson" : "lesson empty"}>
                        {l ? (
                          <>
                            <strong>{l.subject}</strong>
                            <small>{l.schoolClass.name}</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        <nav className="quick-links">
          <a className="card" href="/students">
            تسجيل الحضور
          </a>
          <a className="card" href="/behavior">
            تسجيل السلوك
          </a>
        </nav>

        <style>{`
          .teacher-home { max-width: 960px; margin: 0 auto; padding: 16px; }
          .teacher-header h1 { margin: 0; font-size: 1.6rem; }
          .muted { color: #6b7280; margin: 0 0 4px; }
          .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
          .card h2 { margin: 0 0 10px; font-size: 1.1rem; }
          .list { list-style: none; padding: 0; margin: 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .week-grid { display: grid; gap: 6px; overflow-x: auto; }
          .week-head, .week-row { display: grid; grid-template-columns: 56px repeat(5, minmax(96px, 1fr)); gap: 6px; }
          .week-head > div { font-weight: 600; text-align: center; color: #374151; padding: 6px 0; }
          .period { display: flex; align-items: center; justify-content: center; font-weight: 700; background: #f3f4f6; border-radius: 8px; }
          .lesson { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 56px; padding: 6px; background: #eef6ff; border-radius: 8px; text-align: center; font-size: 0.9rem; }
          .lesson small { color: #4b5563; margin-top: 2px; }
          .lesson.empty { background: #fafafa; color: #9ca3af; }
          .quick-links { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .quick-links a { text-align: center; font-weight: 600; text-decoration: none; color: #1d4ed8; }
          @media (max-width: 600px) { .quick-links { grid-template-columns: 1fr; } }
        `}</style>
      </main>
    );
  }

  const schoolId = user.schoolId;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const [students, classes, teachers, guardians, presentToday, recent] = await Promise.all([
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER", isActive: true } }),
    prisma.student.count({ where: { schoolId, isActive: true, guardianId: { not: null } } }),
    prisma.attendance.count({ where: { schoolId, date: today, status: "PRESENT" } }),
    prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, createdAt: true },
    }),
  ]);
  const absentToday = await prisma.attendance.count({ where: { schoolId, date: today, status: "ABSENT" } });

  const actionLabel: Record<string, string> = { student_deleted: "حذف طالب", user_updated: "تحديث بيانات مستخدم", password_reset: "إعادة تعيين كلمة مرور", user_created: "إضافة مستخدم", excuse_decided: "البتّ في عذر" };

  return (
    <div>
        <section className="kpis">
          <div className="kpi"><small>الطلاب</small><strong>{students}</strong></div>
          <div className="kpi"><small>الفصول</small><strong>{classes}</strong></div>
          <div className="kpi"><small>المعلمون</small><strong>{teachers}</strong></div>
          <div className="kpi"><small>أولياء الأمور المسجلون</small><strong>{guardians}</strong></div>
          <div className="kpi good"><small>الحاضرون اليوم</small><strong>{presentToday}</strong></div>
          <div className="kpi warn"><small>الغائبون اليوم</small><strong>{absentToday}</strong></div>
        </section>

        <section className="panels">
          <div className="panel">
            <h2>روابط سريعة</h2>
            <div className="quick">
              <a href="/attendance">تسجيل الحضور</a>
              <a href="/behavior">تسجيل السلوك</a>
              <a href="/leave">طلبات الاستئذان</a>
              <a href="/substitutes">حصص الانتظار</a>
            </div>
          </div>
          <div className="panel">
            <h2>آخر الأنشطة</h2>
            {recent.length === 0 ? (
              <p className="muted">لا توجد أنشطة مسجّلة بعد.</p>
            ) : (
              <ul className="feed">
                {recent.map((r) => (
                  <li key={r.id}>
                    <span>{actionLabel[r.action] ?? r.action}</span>
                    <small dir="ltr">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
    </div>
  );
}
