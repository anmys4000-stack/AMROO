import type { ReactNode } from "react";

const groups: { title: string; links: [string, string][] }[] = [
  { title: "البيانات", links: [["/students", "الطلاب والمواظبة"], ["/teachers", "المعلمون"], ["/classes", "الفصول"], ["/guardians", "أولياء الأمور"], ["/import", "استيراد البيانات"]] },
  { title: "الجدول والحصص", links: [["/timetable", "الجدول الدراسي"], ["/period-attendance", "تحضير الحصص"], ["/substitutes", "حصص الانتظار"], ["/duty-sheets", "الإشراف والمناوبة"]] },
  { title: "السلوك والتوجيه", links: [["/behavior", "السلوك"], ["/services", "خدمات شؤون الطلاب"], ["/referrals", "الإحالات"], ["/learning-cases", "صعوبات التعلم والنطق"], ["/violation-forms", "محضر المخالفة"], ["/absence-forms", "نماذج الإنذار"]] },
  { title: "الإدارة", links: [["/leave", "الاستئذان والإجازات"], ["/staff-attendance", "دوام المعلمين"], ["/excuses", "الأعذار"], ["/circulars", "التعاميم"], ["/messages", "الرسائل"], ["/visits", "الزيارات الصفية"], ["/plans", "الخطط الأسبوعية"], ["/activities", "الأنشطة"], ["/forms", "النماذج المطبوعة"], ["/catalog", "فهرس النماذج والإجراءات"]] },
  { title: "الاختبارات والتقارير", links: [["/exams", "جدول الاختبارات"], ["/exam-sheets", "كشوف الاختبارات"], ["/invigilation", "لجان القاعات"], ["/reports", "التقارير"], ["/stats", "إحصاءات الشؤون التعليمية"], ["/usage", "إحصاءات الاستخدام"]] },
];

const roleLabel: Record<string, string> = { PRINCIPAL: "مدير المدرسة", STUDENT_AFFAIRS: "وكيل شؤون الطلاب", GUIDANCE: "الموجّه", ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية", TEACHER: "معلم", GUARDIAN: "ولي أمر" };

// الهيكل المشترك للإدارة، على نسق مسار: شريط علوي أبيض (القائمة، البحث، المستخدم، الخروج)،
// وقائمة جانبية داكنة يمين الشاشة تُطوى وتُفتح بزر القائمة، وفيها التاريخ الهجري والميلادي والأقسام.
export default function AdminShell({ fullName, role, children }: { fullName: string; role: string; children: ReactNode }) {
  const now = new Date();
  const gregorian = now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  const hijri = now.toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  return (
    <div className="shell">
      <input type="checkbox" id="side-toggle" className="side-toggle" />
      <aside className="side">
        <div className="brand">
          <strong>مدرستي</strong>
          <small>الجدول، السلوك، المواظبة، والإشراف المدرسي</small>
        </div>
        <div className="datecard">
          <span className="weekday">{gregorian.split(" ")[0]}</span>
          <div className="dates">
            <div className="hijri"><b>{hijri}</b></div>
            <div className="greg"><small>{gregorian.replace(/^\S+\s/, "")}</small></div>
          </div>
        </div>
        <div className="period"><span>الدوام اليومي</span><b>انتهى الدوام لليوم</b></div>
        <nav className="navbody">
          <a className="home" href="/">لوحة التحكم</a>
          {groups.map((g) => (
            <div key={g.title} className="group">
              <p>{g.title}</p>
              {g.links.map(([href, label]) => (
                <a key={href} href={href}>{label}</a>
              ))}
            </div>
          ))}
        </nav>
        <p className="copy">مدرستي للخدمات المدرسية © 2026</p>
      </aside>
      <div className="main">
        <header className="top">
          <div className="top-start">
            <label htmlFor="side-toggle" className="menu-btn" aria-label="إظهار القائمة">☰</label>
            <h2 className="top-title">لوحة التحكم</h2>
            <input className="search" placeholder="ابحث عن طالب أو صفحة…" />
            <a className="pill" href="/help/">شرح الخدمة</a>
          </div>
          <div className="top-end">
            <a className="ghost" href="/auth/logout">خروج</a>
            <a className="ghost" href="/account/signature">توقيعي</a>
            <div className="who">
              <span className="avatar">{fullName.slice(0, 1)}</span>
              <div>
                <strong>{fullName}</strong>
                <span className="role">{roleLabel[role] ?? role}</span>
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
      <style>{`
        .shell { display: grid; grid-template-columns: 300px 1fr; min-height: 100vh; background: #f3f5f8; }
        .side-toggle { display: none; }
        .side { background: linear-gradient(180deg, #0f2f4a 0%, #0f5c5c 100%); color: #e6f2f1; padding: 18px 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 100vh; box-sizing: border-box; }
        .brand strong { display: block; font-size: 1.5rem; color: #fff; }
        .brand small { color: #b7d9d6; font-size: 0.78rem; line-height: 1.6; }
        .datecard { background: rgba(255,255,255,.08); border: 1px solid #d8b75a; border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 12px; }
        .weekday { color: #f0c75e; font-weight: 700; font-size: 1rem; }
        .dates { display: flex; gap: 8px; flex: 1; }
        .hijri, .greg { flex: 1; background: rgba(0,0,0,.18); border-radius: 10px; padding: 8px; text-align: center; color: #fff; }
        .hijri b { color: #f0c75e; font-size: 0.95rem; }
        .greg small { color: #e6f2f1; }
        .period { background: rgba(255,255,255,.07); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
        .period span { color: #f0c75e; font-weight: 700; }
        .period b { color: #d6e9e7; font-weight: 500; }
        .navbody { display: flex; flex-direction: column; gap: 4px; }
        .side a { color: #e6f2f1; text-decoration: none; padding: 7px 10px; border-radius: 10px; font-size: 0.92rem; }
        .side a:hover { background: rgba(255,255,255,.1); }
        .side a.home { background: rgba(255,255,255,.18); font-weight: 700; }
        .group p { margin: 12px 0 4px; color: #f0c75e; font-size: 0.78rem; font-weight: 700; padding: 0 6px; }
        .copy { margin-top: auto; color: #7fb5b1; font-size: 0.75rem; text-align: center; }
        .main { padding: 18px; min-width: 0; }
        .top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #fff; border-radius: 14px; padding: 10px 14px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .top-start, .top-end { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .menu-btn { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: #f3f5f8; cursor: pointer; font-size: 1.2rem; }
        .top-title { margin: 0; font-size: 1.1rem; color: #0f3d3e; }
        .search { width: 240px; max-width: 100%; padding: 9px 12px; border: 1px solid #d9e1ea; border-radius: 10px; font-size: 0.9rem; }
        .pill { background: #dff3ee; color: #0f766e; font-weight: 700; padding: 8px 14px; border-radius: 10px; text-decoration: none; font-size: 0.9rem; }
        .ghost { border: 1px solid #d9e1ea; color: #1d2733; padding: 8px 12px; border-radius: 10px; text-decoration: none; font-size: 0.9rem; }
        .who { display: flex; align-items: center; gap: 10px; border: 1px solid #d9e1ea; border-radius: 14px; padding: 6px 12px; }
        .who strong { display: block; font-size: 0.92rem; }
        .role { display: inline-block; background: #0f766e; color: #fff; border-radius: 8px; padding: 2px 10px; font-size: 0.75rem; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: #0f5c5c; color: #fff; display: grid; place-items: center; font-weight: 700; box-shadow: 0 0 0 3px #d8b75a; }
        .shell .page { padding: 0; max-width: none; }
        .shell h1 { font-size: 1.4rem; margin: 0 0 12px; }
        .shell .card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
        .kpi { background: #fff; border-radius: 14px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); border-top: 3px solid #0f5c5c; }
        .kpi small { display: block; color: #6b7280; margin-bottom: 6px; }
        .kpi strong { font-size: 1.6rem; }
        .kpi.good { border-top-color: #15803d; }
        .kpi.warn { border-top-color: #b45309; }
        .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .panel { background: #fff; border-radius: 14px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
        .panel h2 { margin: 0 0 10px; font-size: 1.05rem; }
        .quick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .quick a { background: #eef5f5; color: #0f4f4f; text-decoration: none; padding: 12px; border-radius: 10px; text-align: center; font-weight: 600; }
        .feed { list-style: none; margin: 0; padding: 0; }
        .feed li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .muted { color: #6b7280; }
        @media (max-width: 900px) {
          .shell { grid-template-columns: 1fr; }
          .side { display: none; position: fixed; top: 0; right: 0; width: 84%; max-width: 320px; height: 100vh; z-index: 50; box-shadow: -8px 0 24px rgba(0,0,0,.25); }
          .side-toggle:checked ~ .side { display: flex; }
          .panels { grid-template-columns: 1fr; }
          .search { width: 100%; }
          .main { padding: 12px; }
        }
        @media (min-width: 901px) {
          .side-toggle:checked ~ .side { display: none; }
          .shell:has(.side-toggle:checked) { grid-template-columns: 1fr; }
        }
        @media (prefers-color-scheme: dark) {
          .shell { background: #0f1720; }
          .top, .who, .shell .card, .kpi, .panel { background: #1a2430; color: #e6ebf1; border-color: #2a3644; }
          .search, .ghost, .menu-btn { background: #111820; color: #e6ebf1; border-color: #2a3644; }
          .quick a { background: #203040; color: #cfe6e4; }
          .feed li { border-bottom-color: #2a3644; }
          .muted, .kpi small { color: #9aa7b6; }
          .top-title { color: #e6ebf1; }
        }
      `}</style>
    </div>
  );
}
