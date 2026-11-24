import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import VisitsPanel from "./VisitsPanel";

// الزيارات الصفية: طلبات المعلمين والوكيل، مع اعتماد أو رفض للوكيل.
export default async function VisitsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  const canApprove = hasPermission(user, "visits:approve");
  if (!canApprove && user.role !== "TEACHER") {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الزيارات.</p>
      </main>
    );
  }
  const visits = await prisma.classVisit.findMany({
    where: { schoolId: user.schoolId, ...(canApprove ? {} : { teacherId: user.id }) },
    orderBy: [{ date: "desc" }, { period: "asc" }],
    take: 100,
    select: { id: true, visitorName: true, date: true, period: true, className: true, note: true, status: true },
  });
  return (
    <main className="page">
      <h1>الزيارات الصفية</h1>
      <VisitsPanel
        canApprove={canApprove}
        visits={visits.map((v) => ({ ...v, date: v.date.toISOString().slice(0, 10) }))}
      />
    </main>
  );
}
