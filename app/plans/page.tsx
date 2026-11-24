import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PlanForm from "./PlanForm";

// الخطط الأسبوعية: المعلم يرفع خطته ويرى خططه، والوكيل يرى من رفع خطته ومن لم يرفعها لهذا الأسبوع.
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ week?: string; type?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }

  const { week: rawWeek, type: rawType } = await searchParams;
  const typeFilter = ["CLASS", "NON_CLASS", "ACTIVITY"].includes(rawType ?? "") ? (rawType as string) : "";
  const riyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  riyadh.setDate(riyadh.getDate() - riyadh.getDay());
  const fallback = riyadh.toISOString().slice(0, 10);
  const weekIso = /^\d{4}-\d{2}-\d{2}$/.test(rawWeek ?? "") ? (rawWeek as string) : fallback;
  const weekStart = new Date(`${weekIso}T00:00:00Z`);

  if (user.role === "TEACHER") {
    const mine = await prisma.weeklyPlan.findUnique({
      where: { teacherId_weekStart: { teacherId: user.id, weekStart } },
      select: { content: true, planType: true },
    });
    return (
      <main className="page">
        <h1>الخطة الأسبوعية</h1>
        <p>
          الأسبوع الذي يبدأ <span dir="ltr">{weekIso}</span>
        </p>
        <PlanForm weekStart={weekIso} initial={mine?.content ?? ""} initialType={mine?.planType ?? "CLASS"} />
      </main>
    );
  }

  if (!hasPermission(user, "visits:approve")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الخطط.</p>
      </main>
    );
  }

  const [teachers, plans] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.weeklyPlan.findMany({
      where: { schoolId: user.schoolId, weekStart, ...(typeFilter ? { planType: typeFilter } : {}) },
      select: { teacherId: true, planType: true, teacher: { select: { fullName: true } } },
    }),
  ]);
  const submitted = new Set(plans.map((p) => p.teacherId));
  const byType = { CLASS: 0, NON_CLASS: 0, ACTIVITY: 0 } as Record<string, number>;
  const allPlans = await prisma.weeklyPlan.findMany({
    where: { schoolId: user.schoolId, weekStart },
    select: { planType: true },
  });
  for (const p of allPlans) byType[p.planType] = (byType[p.planType] ?? 0) + 1;
  const missing = teachers.filter((t) => !submitted.has(t.id));

  return (
    <main className="page">
      <h1>الخطط الأسبوعية</h1>
      <p>
        الأسبوع الذي يبدأ <span dir="ltr">{weekIso}</span> · رفعوا: {submitted.size} · لم يرفعوا: {missing.length}
      </p>
      <form method="GET" className="card">
        <input type="hidden" name="week" value={weekIso} />
        <select name="type" defaultValue={typeFilter}>
          <option value="">كل الأنواع</option>
          <option value="CLASS">حصة صفية ({byType.CLASS})</option>
          <option value="NON_CLASS">غير صفية ({byType.NON_CLASS})</option>
          <option value="ACTIVITY">أنشطة ({byType.ACTIVITY})</option>
        </select>
        <button type="submit">تصفية</button>
      </form>
      {typeFilter && (
        <section className="card">
          <h2>الخطط من نوع المختار</h2>
          <ul className="list">
            {plans.map((p) => (
              <li key={p.teacher.fullName} className="row">
                <span>{p.teacher.fullName}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>لم يرفعوا خططهم</h2>
        {missing.length === 0 ? (
          <p>الجميع رفعوا خططهم.</p>
        ) : (
          <ul className="list">
            {missing.map((t) => (
              <li key={t.id} className="row">
                <span>{t.fullName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
