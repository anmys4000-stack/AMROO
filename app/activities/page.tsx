import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import ActivitiesPanel from "./ActivitiesPanel";

const KIND_LABELS: Record<string, string> = {
  CLASS: "صفي",
  NON_CLASS: "غير صفي",
  BROADCAST: "إذاعة",
  VISIT: "زيارة",
};

// خطة النشاط المدرسي: الأنشطة مرتبة حسب التاريخ، مع إضافة واعتماد لمن يملك الصلاحية.
export default async function ActivitiesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  // المعلم وولي الأمر يرون الأنشطة المعتمدة فقط، للعرض دون تعديل.
  const isViewer = user.role === "TEACHER" || user.role === "GUARDIAN";
  if (!isViewer && !hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الأنشطة.</p>
      </main>
    );
  }

  const activities = await prisma.activityPlan.findMany({
    where: { schoolId: user.schoolId, ...(isViewer ? { approved: true } : {}) },
    orderBy: { date: "asc" },
    take: 200,
    select: { id: true, kind: true, title: true, date: true, approved: true },
  });

  return (
    <main className="page">
      <h1>{isViewer ? "الأنشطة المعتمدة" : "خطة النشاط المدرسي"}</h1>
      <ActivitiesPanel
        canEdit={hasPermission(user, "visits:approve")}
        activities={activities.map((a) => ({
          id: a.id,
          kind: KIND_LABELS[a.kind] ?? a.kind,
          title: a.title,
          date: a.date.toISOString().slice(0, 10),
          approved: a.approved,
        }))}
      />
    </main>
  );
}
