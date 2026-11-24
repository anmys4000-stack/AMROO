import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import PlanForm from "./PlanForm";

// الخطط الأسبوعية: المعلم يرفع خطته ويرى خططه، والوكيل يرى من رفع خطته ومن لم يرفعها لهذا الأسبوع.
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }

  const { week: rawWeek } = await searchParams;
  const riyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  riyadh.setDate(riyadh.getDate() - riyadh.getDay());
  const fallback = riyadh.toISOString().slice(0, 10);
  const weekIso = /^\d{4}-\d{2}-\d{2}$/.test(rawWeek ?? "") ? (rawWeek as string) : fallback;
  const weekStart = new Date(`${weekIso}T00:00:00Z`);

  if (user.role === "TEACHER") {
    const mine = await prisma.weeklyPlan.findUnique({
      where: { teacherId_weekStart: { teacherId: user.id, weekStart } },
      select: { content: true },
    });
    return (
      <main className="page">
        <h1>الخطة الأسبوعية</h1>
        <p>
          الأسبوع الذي يبدأ <span dir="ltr">{weekIso}</span>
        </p>
        <PlanForm weekStart={weekIso} initial={mine?.content ?? ""} />
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
      where: { schoolId: user.schoolId, weekStart },
      select: { teacherId: true },
    }),
  ]);
  const submitted = new Set(plans.map((p) => p.teacherId));
  const missing = teachers.filter((t) => !submitted.has(t.id));

  return (
    <main className="page">
      <h1>الخطط الأسبوعية</h1>
      <p>
        الأسبوع الذي يبدأ <span dir="ltr">{weekIso}</span> · رفعوا: {submitted.size} · لم يرفعوا: {missing.length}
      </p>
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
