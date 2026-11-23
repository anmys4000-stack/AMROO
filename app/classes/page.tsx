import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// صفحة الفصول: كل فصل مع عدد طلابه وعدد حصصه الدراسية، داخل مدرسة المستخدم فقط.
export default async function ClassesPage() {
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
        <p>ليست لديك صلاحية لعرض الفصول.</p>
      </main>
    );
  }

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true, periods: true } },
    },
  });

  return (
    <main className="page">
      <h1>الفصول</h1>
      <p>عدد الفصول: {classes.length}</p>
      <ul className="list">
        {classes.map((c) => (
          <li key={c.id} className="card row">
            <span>{c.name}</span>
            <span>
              {c._count.students} طالب · {c._count.periods} حصة
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
