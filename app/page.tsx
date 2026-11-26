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
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [
    attendanceToday,
    absentToday,
    openReferrals,
    violationsToday,
    violationsMonth,
    leavesToday,
    leavesPending,
    teachersAbsent,
    teacherCount,
    loggedInToday,
    recent,
  ] = await Promise.all([
    prisma.attendance.count({ where: { schoolId, date: today } }),
    prisma.attendance.count({ where: { schoolId, date: today, status: "ABSENT" } }),
    prisma.referral.count({ where: { schoolId, status: "OPEN" } }),
    prisma.behaviorRecord.count({ where: { schoolId, category: "مخالفة", createdAt: { gte: today } } }),
    prisma.behaviorRecord.count({ where: { schoolId, category: "مخالفة", createdAt: { gte: monthStart } } }),
    prisma.leaveRequest.count({ where: { schoolId, date: today, status: "APPROVED" } }),
    prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }),
    prisma.staffAttendance.count({ where: { schoolId, date: today, kind: "ABSENT" } }),
    prisma.user.count({ where: { schoolId, role: "TEACHER", isActive: true } }),
    prisma.user.count({ where: { schoolId, isActive: true, lastLoginAt: { gte: today } } }),
    prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, createdAt: true },
    }),
  ]);
  const absentPct = attendanceToday > 0 ? ((absentToday / attendanceToday) * 100).toFixed(1) : "0.0";
  const actionLabel: Record<string, string> = { student_deleted: "حذف طالب", user_updated: "تحديث بيانات مستخدم", password_reset: "إعادة تعيين كلمة مرور", user_created: "إضافة مستخدم", excuse_decided: "البتّ في عذر", login: "دخول للنظام", credentials_reset: "توليد بيانات دخول", roles_updated: "تحديث الأدوار", counselors_assigned: "توزيع الموجهين", teachers_linked: "ربط المعلمين", school_updated: "تحديث بيانات المدرسة" };

  return (
    <div className="dash">
      <section className="dash-card">
        <h2 className="dash-h">مهامك اليوم</h2>
        <div className="task-row">
          <a className="task" href="/referrals">
            <span className="badge">{openReferrals}</span>
            <span>إحالات محوّلة إليك قيد المتابعة</span>
          </a>
          <a className="task" href="/leave">
            <span className="badge">{leavesPending}</span>
            <span>طلبات استئذان/إجازة بانتظار قرارك</span>
          </a>
        </div>
      </section>

      <section>
        <h2 className="dash-h">حالة اليوم الدراسي</h2>
        <div className="status-grid">
          <div className="stat wide">
            <small>نسبة الغياب اليوم</small>
            <strong>{absentPct}%</strong>
            <span>{absentToday} غائب من {attendanceToday}</span>
          </div>
          <div className="stat">
            <small>المخالفات السلوكية</small>
            <strong>{violationsToday}</strong>
            <span>اليوم · {violationsMonth} هذا الشهر</span>
          </div>
          <div className="stat">
            <small>الإحالات الصفية</small>
            <strong>{openReferrals}</strong>
            <span>قيد المتابعة</span>
          </div>
          <div className="stat">
            <small>الاستئذان والإجازات اليوم</small>
            <strong>{leavesToday}</strong>
            <span>{leavesPending} بانتظار الرد</span>
          </div>
          <div className="stat">
            <small>المعلمون الغائبون</small>
            <strong>{teachersAbsent}</strong>
            <span>{teachersAbsent === 0 ? "لا غياب مسجل للمعلمين" : `من ${teacherCount} معلمًا`}</span>
          </div>
          <div className="stat">
            <small>الدخول للنظام اليوم</small>
            <strong>{loggedInToday}</strong>
            <span>من {teacherCount} معلمًا نشطًا</span>
          </div>
        </div>
      </section>

      <section className="dash-card">
        <h2 className="dash-h">آخر الأنشطة</h2>
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
      </section>

      <style>{`
        .dash { display: grid; gap: 14px; }
        .dash-card { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
        .dash-h { margin: 0 0 12px; font-size: 1.05rem; color: #0f3d3e; }
        .task-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
        .task { display: flex; align-items: center; gap: 10px; border: 1px solid #e5e9ef; border-radius: 12px; padding: 12px; text-decoration: none; color: #1d2733; }
        .badge { min-width: 34px; height: 34px; border-radius: 10px; background: #fff3e0; color: #b45309; font-weight: 800; display: grid; place-items: center; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
        .stat { background: #fff; border-radius: 14px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); border-top: 3px solid #0f5c5c; display: grid; gap: 4px; }
        .stat.wide { background: #e9f7f4; }
        .stat small { color: #374151; font-weight: 700; }
        .stat strong { font-size: 2rem; color: #0f3d3e; }
        .stat span { color: #6b7280; font-size: 0.85rem; }
        .feed { list-style: none; margin: 0; padding: 0; }
        .feed li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .muted { color: #6b7280; }
        @media (prefers-color-scheme: dark) {
          .dash-card, .stat { background: #1a2430; color: #e6ebf1; }
          .stat.wide { background: #173b3a; }
          .dash-h, .stat strong { color: #e6ebf1; }
          .task { border-color: #2a3644; color: #e6ebf1; }
        }
      `}</style>
    </div>
  );
}
