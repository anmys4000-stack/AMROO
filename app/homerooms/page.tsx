import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import HomeroomPanel from "./HomeroomPanel";

// رواد الفصول: لكل فصل رائد من المعلمين، يُعيَّن من المدير.
export default async function HomeroomsPage() {
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
        <p>ليست لديك صلاحية لعرض رواد الفصول.</p>
      </main>
    );
  }

  const [classes, teachers] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, homeroomLeaderId: true },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <main className="page">
      <h1>رواد الفصول</h1>
      <HomeroomPanel
        canEdit={hasPermission(user, "users:manage")}
        teachers={teachers}
        classes={classes.map((c) => ({ id: c.id, name: c.name, leaderId: c.homeroomLeaderId ?? "" }))}
      />
    </main>
  );
}
