import Link from "next/link";
import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

// البحث عن طالب بالاسم أو الرقم المرجعي داخل مدرسة المستخدم فقط.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
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
        <p>ليست لديك صلاحية للبحث.</p>
      </main>
    );
  }

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 60);
  const results =
    q.length >= 2
      ? await prisma.student.findMany({
          where: {
            schoolId: user.schoolId,
            isActive: true,
            OR: [{ fullName: { contains: q } }, { nationalRef: { contains: q } }],
          },
          select: { id: true, fullName: true, schoolClass: { select: { name: true } } },
          orderBy: { fullName: "asc" },
          take: 100,
        })
      : [];

  return (
    <main className="page">
      <h1>البحث عن طالب</h1>
      <form method="GET" className="card">
        <input name="q" defaultValue={q} placeholder="اسم الطالب أو رقمه المرجعي" minLength={2} maxLength={60} />
        <button type="submit">بحث</button>
      </form>
      {q.length >= 2 && results.length === 0 && <p>لا توجد نتائج.</p>}
      <ul className="list">
        {results.map((s) => (
          <li key={s.id} className="card row">
            <Link href={`/students/${s.id}`}>{s.fullName}</Link>
            <span>{s.schoolClass?.name ?? "بدون فصل"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
