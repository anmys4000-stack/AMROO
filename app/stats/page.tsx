import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// إحصائيات الشؤون التعليمية: حصص الانتظار، المناوبة والإشراف، والاستئذان المعتمد لكل معلم.
export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "visits:approve")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الإحصائيات.</p>
      </main>
    );
  }

  const [subs, duties, leaves, teachers] = await Promise.all([
    prisma.substitution.groupBy({ by: ["substituteId"], where: { schoolId: user.schoolId }, _count: { _all: true } }),
    prisma.dutyAssignment.groupBy({ by: ["teacherId", "kind"], where: { schoolId: user.schoolId }, _count: { _all: true } }),
    prisma.leaveRequest.groupBy({ by: ["teacherId"], where: { schoolId: user.schoolId, status: "APPROVED" }, _count: { _all: true } }),
    prisma.user.findMany({ where: { schoolId: user.schoolId, role: "TEACHER" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  const subMap = new Map(subs.map((s) => [s.substituteId, s._count._all]));
  const leaveMap = new Map(leaves.map((l) => [l.teacherId, l._count._all]));
  const breakMap = new Map<string, number>();
  const dutyMap = new Map<string, number>();
  for (const d of duties) {
    if (d.kind === "BREAK") breakMap.set(d.teacherId, d._count._all);
    if (d.kind === "DUTY") dutyMap.set(d.teacherId, d._count._all);
  }

  const rows = teachers.map((t) => ({
    id: t.id,
    name: t.fullName,
    substitutions: subMap.get(t.id) ?? 0,
    breaks: breakMap.get(t.id) ?? 0,
    duties: dutyMap.get(t.id) ?? 0,
    leaves: leaveMap.get(t.id) ?? 0,
  }));

  return (
    <main className="page">
      <h1>إحصائيات الشؤون التعليمية</h1>
      <table className="table">
        <thead>
          <tr>
            <th>المعلم</th>
            <th>حصص الانتظار</th>
            <th>الإشراف على الفسحة</th>
            <th>المناوبة</th>
            <th>الاستئذان المعتمد</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.substitutions}</td>
              <td>{r.breaks}</td>
              <td>{r.duties}</td>
              <td>{r.leaves}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
