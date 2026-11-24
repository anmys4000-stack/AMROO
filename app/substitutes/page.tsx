import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import { distribute, type Lesson, type Teacher } from "../../src/lib/substitutes";
import SubstitutesPanel from "./SubstitutesPanel";

const DAYS = ["", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

// حصص الانتظار ليوم محدد: المعلمون الغائبون بإذن معتمد، وتوزيع حصصهم على المتاحين.
export default async function SubstitutesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
        <p>ليست لديك صلاحية لتوزيع حصص الانتظار.</p>
      </main>
    );
  }

  const { date: rawDate } = await searchParams;
  const riyadh = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? (rawDate as string) : riyadh.toISOString().slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = date.getUTCDay() + 1;

  const [leaves, teachers, lessons] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { schoolId: user.schoolId, date, status: "APPROVED" },
      select: { teacher: { select: { id: true, fullName: true } } },
    }),
    prisma.user.findMany({
      where: { schoolId: user.schoolId, role: "TEACHER", isActive: true },
      select: { id: true, fullName: true },
    }),
    prisma.timetableEntry.findMany({
      where: { schoolId: user.schoolId },
      select: {
        classId: true,
        weekday: true,
        period: true,
        subject: true,
        teacherId: true,
        teacherName: true,
        schoolClass: { select: { name: true } },
      },
    }),
  ]);

  const absent: Teacher[] = leaves.map((l) => l.teacher);
  const absentIds = new Set(absent.map((a) => a.id));
  const available: Teacher[] = teachers.filter((t) => !absentIds.has(t.id));
  const lessonRows: Lesson[] = lessons.map((l) => ({
    classId: l.classId,
    className: l.schoolClass.name,
    weekday: l.weekday,
    period: l.period,
    subject: l.subject,
    teacherId: l.teacherId,
    teacherName: l.teacherName,
  }));

  const proposals = distribute({ weekday, absent, available, lessons: lessonRows });

  return (
    <main className="page">
      <h1>حصص الانتظار</h1>
      <form method="GET" className="card">
        <input type="date" name="date" dir="ltr" defaultValue={iso} />
        <button type="submit">عرض</button>
      </form>
      <p>
        {DAYS[weekday] ?? "عطلة"} · <span dir="ltr">{iso}</span>
      </p>
      {absent.length === 0 ? (
        <p>لا يوجد معلمون غائبون بإذن معتمد لهذا اليوم.</p>
      ) : (
        <>
          <p>الغائبون: {absent.map((a) => a.fullName).join("، ")}</p>
          <SubstitutesPanel date={iso} proposals={proposals} />
        </>
      )}
    </main>
  );
}
