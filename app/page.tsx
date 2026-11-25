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
  const todayIso = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" })).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const groups: { title: string; links: [string, string][] }[] = [
    { title: "البيانات", links: [["/students", "الطلاب والمواظبة"], ["/teachers", "المعلمون"], ["/classes", "الفصول"], ["/guardians", "أولياء الأمور"], ["/import", "استيراد البيانات"]] },
    { title: "الجدول والحصص", links: [["/timetable", "الجدول الدراسي"], ["/period-attendance", "تحضير الحصص"], ["/substitutes", "حصص الانتظار"], ["/duty-sheets", "الإشراف والمناوبة"]] },
    { title: "السلوك والتوجيه", links: [["/behavior", "السلوك"], ["/services", "خدمات شؤون الطلاب"], ["/referrals", "الإحالات"], ["/learning-cases", "صعوبات التعلم والنطق"], ["/violation-forms", "محضر المخالفة"], ["/absence-forms", "نماذج الإنذار"]] },
    { title: "الإدارة", links: [["/leave", "الاستئذان والإجازات"], ["/excuses", "الأعذار"], ["/circulars", "التعاميم"], ["/messages", "الرسائل"], ["/visits", "الزيارات الصفية"], ["/plans", "الخطط الأسبوعية"], ["/activities", "الأنشطة"]] },
    { title: "الاختبارات والتقارير", links: [["/exams", "جدول الاختبارات"], ["/exam-sheets", "كشوف الاختبارات"], ["/invigilation", "لجان القاعات"], ["/reports", "التقارير"], ["/stats", "إحصاءات الشؤون التعليمية"], ["/usage", "إحصاءات الاستخدام"]] },
  ];
  const roleLabel: Record<string, string> = { PRINCIPAL: "مدير المدرسة", STUDENT_AFFAIRS: "وكيل شؤون الطلاب", GUIDANCE: "الموجّه", ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية", TEACHER: "معلم", GUARDIAN: "ولي أمر" };
  const actionLabel: Record<string, string> = { student_deleted: "حذف طالب", user_updated: "تحديث بيانات مستخدم", password_reset: "إعادة تعيين كلمة مرور", user_created: "إضافة مستخدم", excuse_decided: "البتّ في عذر" };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <strong>مدرستي</strong>
          <small>الجدول، السلوك، المواظبة، والإشراف المدرسي</small>
        </div>
        <div className="today">
          <span>اليوم</span>
          <strong>{todayIso}</strong>
        </div>
        <a className="home" href="/">لوحة التحكم</a>
        {groups.map((g) => (
          <div key={g.title} className="group">
            <p>{g.title}</p>
            {g.links.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <header className="top">
          <h1>لوحة التحكم</h1>
          <div className="who">
            <span className="avatar">{user.fullName.slice(0, 1)}</span>
            <div>
              <strong>{user.fullName}</strong>
              <small>{roleLabel[user.role] ?? user.role}</small>
            </div>
          </div>
        </header>

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

      <style>{`
        .shell { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; background: #f3f5f8; }
        .side { background: linear-gradient(180deg, #0f3d3e, #0b2f30); color: #e6f2f1; padding: 16px 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
        .brand strong { display: block; font-size: 1.4rem; }
        .brand small { color: #9fc7c4; font-size: 0.75rem; }
        .today { background: rgba(255,255,255,.08); border-radius: 10px; padding: 10px; margin: 10px 0; font-size: 0.8rem; color: #cfe6e4; }
        .today strong { display: block; color: #fff; font-size: 0.95rem; }
        .side a { color: #e6f2f1; text-decoration: none; padding: 6px 10px; border-radius: 8px; font-size: 0.9rem; }
        .side a:hover { background: rgba(255,255,255,.1); }
        .side a.home { background: rgba(255,255,255,.14); font-weight: 700; }
        .group p { margin: 10px 0 2px; color: #7fb5b1; font-size: 0.75rem; padding: 0 10px; }
        .main { padding: 18px; min-width: 0; }
        .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .top h1 { margin: 0; font-size: 1.5rem; }
        .who { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 8px 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .who small { display: block; color: #6b7280; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: #0f5c5c; color: #fff; display: grid; place-items: center; font-weight: 700; }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
        .kpi { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); border-top: 3px solid #0f5c5c; }
        .kpi small { display: block; color: #6b7280; margin-bottom: 6px; }
        .kpi strong { font-size: 1.6rem; }
        .kpi.good { border-top-color: #15803d; }
        .kpi.warn { border-top-color: #b45309; }
        .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .panel { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
        .panel h2 { margin: 0 0 10px; font-size: 1.05rem; }
        .quick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .quick a { background: #eef5f5; color: #0f4f4f; text-decoration: none; padding: 12px; border-radius: 10px; text-align: center; font-weight: 600; }
        .feed { list-style: none; margin: 0; padding: 0; }
        .feed li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .muted { color: #6b7280; }
        @media (max-width: 800px) {
          .shell { grid-template-columns: 1fr; }
          .side { position: static; }
          .panels { grid-template-columns: 1fr; }
        }
        @media (prefers-color-scheme: dark) {
          .shell { background: #0f1720; }
          .kpi, .panel, .who { background: #1a2430; color: #e6ebf1; }
          .quick a { background: #203040; color: #cfe6e4; }
          .feed li { border-bottom-color: #2a3644; }
          .muted, .kpi small, .who small { color: #9aa7b6; }
        }
      `}</style>
    </div>
  );
}
