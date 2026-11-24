import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// إحصاءات الاستخدام للمدير: عدد العمليات لكل مستخدم خلال آخر 30 يومًا، من سجل التدقيق. للقراءة فقط.
export default async function UsagePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "users:manage")) {
    return (
      <main className="page">
        <p>هذه الصفحة للمدير فقط.</p>
      </main>
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.auditLog.groupBy({
    by: ["actorId"],
    where: { schoolId: user.schoolId, createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { actorId: "desc" } },
    take: 100,
  });
  const actorIds = grouped.map((g) => g.actorId).filter((id): id is string => !!id);
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds }, schoolId: user.schoolId },
    select: { id: true, fullName: true, role: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  return (
    <main className="page">
      <h1>إحصاءات الاستخدام</h1>
      <p>عدد العمليات المسجّلة خلال آخر 30 يومًا: {total}</p>
      {grouped.length === 0 ? (
        <p>لا توجد عمليات مسجّلة في هذه الفترة.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الدور</th>
              <th>عدد العمليات</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g, i) => {
              const u = g.actorId ? byId.get(g.actorId) : undefined;
              return (
                <tr key={g.actorId ?? `system-${i}`}>
                  <td>{u?.fullName ?? "النظام"}</td>
                  <td>{u?.role ?? "-"}</td>
                  <td>{g._count._all}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
