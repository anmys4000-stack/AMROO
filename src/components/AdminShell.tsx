import type { ReactNode } from "react";

const groups: { title: string; links: [string, string][] }[] = [
  { title: "البيانات", links: [["/students", "الطلاب والمواظبة"], ["/teachers", "المعلمون"], ["/classes", "الفصول"], ["/guardians", "أولياء الأمور"], ["/import", "استيراد البيانات"]] },
  { title: "الجدول والحصص", links: [["/timetable", "الجدول الدراسي"], ["/period-attendance", "تحضير الحصص"], ["/substitutes", "حصص الانتظار"], ["/duty-sheets", "الإشراف والمناوبة"]] },
  { title: "السلوك والتوجيه", links: [["/behavior", "السلوك"], ["/services", "خدمات شؤون الطلاب"], ["/referrals", "الإحالات"], ["/learning-cases", "صعوبات التعلم والنطق"], ["/violation-forms", "محضر المخالفة"], ["/absence-forms", "نماذج الإنذار"]] },
  { title: "الإدارة", links: [["/leave", "الاستئذان والإجازات"], ["/staff-attendance", "دوام المعلمين"], ["/excuses", "الأعذار"], ["/circulars", "التعاميم"], ["/messages", "الرسائل"], ["/visits", "الزيارات الصفية"], ["/plans", "الخطط الأسبوعية"], ["/activities", "الأنشطة"], ["/forms", "النماذج المطبوعة"], ["/catalog", "فهرس النماذج والإجراءات"]] },
  { title: "الاختبارات والتقارير", links: [["/exams", "جدول الاختبارات"], ["/exam-sheets", "كشوف الاختبارات"], ["/invigilation", "لجان القاعات"], ["/reports", "التقارير"], ["/stats", "إحصاءات الشؤون التعليمية"], ["/usage", "إحصاءات الاستخدام"]] },
];

const roleLabel: Record<string, string> = { PRINCIPAL: "مدير المدرسة", STUDENT_AFFAIRS: "وكيل شؤون الطلاب", GUIDANCE: "الموجّه", ACADEMIC_DEPUTY: "وكيل الشؤون التعليمية", TEACHER: "معلم", GUARDIAN: "ولي أمر" };

// الهيكل المشترك للإدارة: شريط جانبي مجمّع يمين الشاشة، وشريط علوي باسم المستخدم ودوره.
export default function AdminShell({ fullName, role, children }: { fullName: string; role: string; children: ReactNode }) {
  const todayIso = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" })).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <strong>مدرستي</strong>
          <small>الجدول، السلوك، المواظبة، والإشراف المدرسي</small>
        </div>
        <input type="checkbox" id="nav-toggle" className="nav-toggle" />
        <label htmlFor="nav-toggle" className="menu-btn">القائمة</label>
        <div className="navbody">
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
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <div className="who">
            <span className="avatar">{fullName.slice(0, 1)}</span>
            <div>
              <strong>{fullName}</strong>
              <small>{roleLabel[role] ?? role}</small>
            </div>
          </div>
        </header>
        {children}
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
        .top { display: flex; justify-content: flex-end; margin-bottom: 14px; }
        .who { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 8px 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .who small { display: block; color: #6b7280; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: #0f5c5c; color: #fff; display: grid; place-items: center; font-weight: 700; }
        .shell .page { padding: 0; max-width: none; }
        .shell h1 { font-size: 1.5rem; margin: 0 0 12px; }
        .shell .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
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
        .menu-btn { display: none; }
        .nav-toggle { display: none; }
        @media (max-width: 800px) {
          .panels { grid-template-columns: 1fr; }
          .shell { grid-template-columns: 1fr; }
          .side { position: static; gap: 0; }
          .menu-btn { display: block; margin-top: 10px; padding: 10px; background: rgba(255,255,255,.14); border-radius: 8px; text-align: center; color: #fff; cursor: pointer; font-weight: 700; }
          .navbody { display: none; }
          .nav-toggle:checked ~ .navbody { display: block; }
          .main { padding: 12px; }
        }
        @media (prefers-color-scheme: dark) {
          .shell { background: #0f1720; }
          .who { background: #1a2430; color: #e6ebf1; }
          .who small { color: #9aa7b6; }
          .shell .card, .kpi, .panel { background: #1a2430; color: #e6ebf1; }
          .quick a { background: #203040; color: #cfe6e4; }
          .feed li { border-bottom-color: #2a3644; }
          .muted, .kpi small, .who small { color: #9aa7b6; }
        }
      `}</style>
    </div>
  );
}
