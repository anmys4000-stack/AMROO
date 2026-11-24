import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import LeavePanel from "./LeavePanel";

const STATUS_LABELS: Record<string, string> = { PENDING: "قيد الاعتماد", APPROVED: "معتمد", REJECTED: "مرفوض" };

// الاستئذان: المعلم يقدّم طلبه ويرى طلباته، والمدير أو الوكيل يعتمد ويؤمّن الحصص.
export default async function LeavePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }

  const canDecide = hasPermission(user, "visits:approve");
  const leaves = await prisma.leaveRequest.findMany({
    where: canDecide ? { schoolId: user.schoolId } : { schoolId: user.schoolId, teacherId: user.id },
    orderBy: [{ status: "asc" }, { date: "desc" }],
    take: 200,
    select: {
      id: true,
      date: true,
      leaveAt: true,
      returnAt: true,
      reason: true,
      coverage: true,
      status: true,
      teacher: { select: { fullName: true } },
    },
  });

  return (
    <main className="page">
      <h1>الاستئذان</h1>
      <LeavePanel
        canDecide={canDecide}
        leaves={leaves.map((l) => ({
          id: l.id,
          teacher: l.teacher.fullName,
          date: l.date.toISOString().slice(0, 10),
          leaveAt: l.leaveAt,
          returnAt: l.returnAt,
          reason: l.reason,
          coverage: l.coverage,
          status: STATUS_LABELS[l.status] ?? l.status,
          pending: l.status === "PENDING",
        }))}
      />
    </main>
  );
}
