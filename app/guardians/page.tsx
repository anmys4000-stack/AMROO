import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// صفحة أولياء الأمور: الطلاب المسجّل لهم اسم ولي أمر، داخل مدرسة المستخدم فقط.
export default async function GuardiansPage() {
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
        <p>ليست لديك صلاحية لعرض أولياء الأمور.</p>
      </main>
    );
  }

  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId, isActive: true, guardianName: { not: null } },
    select: {
      id: true,
      fullName: true,
      guardianName: true,
      guardianPhone: true,
      schoolClass: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <main className="page">
      <h1>أولياء الأمور</h1>
      <p>عدد السجلات: {students.length}</p>
      {students.length === 0 ? (
        <p>لا توجد بيانات أولياء أمور بعد.</p>
      ) : (
        <ul className="list">
          {students.map((s) => (
            <li key={s.id} className="card row">
              <span>
                {s.guardianName} — {s.fullName}
              </span>
              <span dir="ltr">
                {s.guardianPhone ?? ""} {s.schoolClass ? `· ${s.schoolClass.name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
