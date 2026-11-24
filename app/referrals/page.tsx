import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import ReferralPanel from "./ReferralPanel";

// الإحالات: المفتوحة والمغلقة، مع نموذج الإحالة الجديدة ومعالجة المفتوحة للمخوّلين.
export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "referrals:handle") && !hasPermission(user, "behavior:record")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الإحالات.</p>
      </main>
    );
  }

  const [referrals, students] = await Promise.all([
    prisma.referral.findMany({
      where: { schoolId: user.schoolId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: { id: true, reason: true, action: true, status: true, createdAt: true, student: { select: { fullName: true } } },
    }),
    prisma.student.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
  ]);

  return (
    <main className="page">
      <h1>الإحالات</h1>
      <ReferralPanel
        students={students}
        canHandle={hasPermission(user, "referrals:handle")}
        referrals={referrals.map((r) => ({
          id: r.id,
          studentName: r.student.fullName,
          reason: r.reason,
          action: r.action,
          status: r.status,
          date: r.createdAt.toISOString().slice(0, 10),
        }))}
      />
    </main>
  );
}
