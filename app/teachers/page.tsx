import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import ResetButton from "./ResetButton";

// صفحة المعلمين: الحاصلون على حساب، ثم أسماء المعلمين الموجودين في الجدول دون حساب بعد.
export default async function TeachersPage() {
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
        <p>ليست لديك صلاحية لعرض المعلمين.</p>
      </main>
    );
  }

  const [accounts, entries] = await Promise.all([
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true, specialty: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.timetableEntry.findMany({
      where: { schoolId: user.schoolId, teacherId: null, teacherName: { not: null } },
      select: { teacherName: true },
    }),
  ]);

  const unlinkedNames = [...new Set(entries.map((e) => e.teacherName as string))].sort((a, b) =>
    a.localeCompare(b, "ar")
  );

  return (
    <main className="page">
      <h1>المعلمون</h1>
      <p>
        المعلمون بحساب: {accounts.length} · أسماء من الجدول دون حساب: {unlinkedNames.length}
      </p>

      <h2>المعلمون بحساب</h2>
      {accounts.length === 0 ? (
        <p>لا يوجد معلمون بحساب بعد.</p>
      ) : (
        <ul className="list">
          {accounts.map((t) => (
            <li key={t.id} className="card row">
              <span>{t.fullName}</span>
              <span>{t.specialty ?? ""}</span>
              {user.role === "PRINCIPAL" && <ResetButton userId={t.id} />}
            </li>
          ))}
        </ul>
      )}

      <h2>معلمون في الجدول دون حساب</h2>
      <ul className="list">
        {unlinkedNames.map((name) => (
          <li key={name} className="card row">
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
