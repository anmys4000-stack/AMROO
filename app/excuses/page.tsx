import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import DecisionButtons from "./DecisionButtons";
import ExcuseForm from "./ExcuseForm";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
};

// أعذار الغياب: آخر 100 عذر في مدرسة المستخدم، مع اعتماد أو رفض للمخوّلين.
export default async function ExcusesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الأعذار.</p>
      </main>
    );
  }

  const excuses = await prisma.excuse.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, date: true, reason: true, status: true, student: { select: { fullName: true } } },
  });
  const canDecide = hasPermission(user, "visits:approve");

  return (
    <main className="page">
      <h1>أعذار الغياب</h1>
      {hasPermission(user, "attendance:record") && <ExcuseForm />}
      {excuses.length === 0 ? (
        <p>لا توجد أعذار بعد.</p>
      ) : (
        <ul className="list">
          {excuses.map((e) => (
            <li key={e.id} className="card row">
              <span>
                {e.student.fullName} · <span dir="ltr">{e.date.toISOString().slice(0, 10)}</span> · {e.reason}
              </span>
              <span>
                {STATUS_LABELS[e.status]}
                {canDecide && e.status === "PENDING" && <DecisionButtons id={e.id} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
