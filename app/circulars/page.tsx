import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import CircularsPanel from "./CircularsPanel";

// التعاميم: يعرض كل مستخدم ما يخصه منها، ويسجّل اطلاعه بضغطة واحدة.
// المدير والوكيل يريان كشف الاطلاع لكل تعميم: من اطّلع ومن لم يطّلع من المعلمين.
export default async function CircularsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }

  const canPublish = hasPermission(user, "visits:approve");
  const audienceFilter = user.role === "TEACHER" || canPublish ? {} : { audience: "ALL" };
  const circulars = await prisma.circular.findMany({
    where: { schoolId: user.schoolId, ...audienceFilter },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      body: true,
      audience: true,
      createdAt: true,
      reads: { select: { userId: true } },
    },
  });

  const teachers = canPublish
    ? await prisma.user.findMany({
        where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
        select: { id: true, fullName: true },
      })
    : [];

  const readSet = new Set(circulars.flatMap((c) => c.reads.map((r) => `${c.id}:${r.userId}`)));

  return (
    <main className="page">
      <h1>التعاميم</h1>
      <CircularsPanel
        canPublish={canPublish}
        circulars={circulars.map((c) => ({
          id: c.id,
          title: c.title,
          body: c.body,
          audience: c.audience,
          date: c.createdAt.toISOString().slice(0, 10),
          read: readSet.has(`${c.id}:${user.id}`),
          // كشف الاطلاع: للمعلمين فقط عند التعاميم التي تخصهم أو للجميع.
          unread: canPublish
            ? teachers.filter((t) => !readSet.has(`${c.id}:${t.id}`)).map((t) => t.fullName)
            : [],
        }))}
      />
    </main>
  );
}
