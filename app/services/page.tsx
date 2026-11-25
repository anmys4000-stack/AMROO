import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import ServicesPanel from "./ServicesPanel";

// خدمات شؤون الطلاب: النقاط التحفيزية، حضور الكادر، تقرير المناوبة اليومي، وتقارير الأنشطة.
export default async function ServicesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  const canPoints = hasPermission(user, "behavior:record");
  const canStaff = hasPermission(user, "visits:approve");
  const canDuty = canStaff || hasPermission(user, "attendance:record");
  const canActivity = hasPermission(user, "attendance:record");
  if (!canPoints && !canStaff && !canDuty && !canActivity) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الخدمات.</p>
      </main>
    );
  }

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }).slice(0, 10) + "T00:00:00Z");
  const todayIso = today.toISOString().slice(0, 10);

  const [students, teachers, points, staff, duty, approvedActivities, activities] = await Promise.all([
    canPoints
      ? prisma.student.findMany({
          where: { schoolId: user.schoolId, isActive: true },
          select: { id: true, fullName: true, schoolClass: { select: { name: true } } },
          orderBy: { fullName: "asc" },
          take: 800,
        })
      : Promise.resolve([]),
    canStaff
      ? prisma.user.findMany({
          where: { schoolId: user.schoolId, role: "TEACHER" },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
    canPoints
      ? prisma.pointsAward.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, points: true, reason: true, createdAt: true, student: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canStaff
      ? prisma.staffAttendance.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, kind: true, minutes: true, date: true, teacher: { select: { fullName: true } } },
          orderBy: { date: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canDuty
      ? prisma.dutyReport.findUnique({
          where: { schoolId_date: { schoolId: user.schoolId, date: today } },
          select: { notes: true },
        })
      : Promise.resolve(null),
    canActivity
      ? prisma.activityPlan.findMany({
          where: { schoolId: user.schoolId, approved: true },
          select: { id: true, title: true, date: true },
          orderBy: { date: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    canActivity
      ? prisma.activityReport.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, title: true, body: true, evidence: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="page">
      <h1>خدمات شؤون الطلاب</h1>
      <ServicesPanel
        todayIso={todayIso}
        canPoints={canPoints}
        canStaff={canStaff}
        canDuty={canDuty}
        canActivity={canActivity}
        students={students.map((s) => ({ id: s.id, label: `${s.fullName} · ${s.schoolClass?.name ?? ""}` }))}
        teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
        points={points.map((p) => ({ id: p.id, student: p.student.fullName, points: p.points, reason: p.reason, date: p.createdAt.toISOString().slice(0, 10) }))}
        staff={staff.map((s) => ({ id: s.id, teacher: s.teacher.fullName, kind: s.kind, minutes: s.minutes, date: s.date.toISOString().slice(0, 10) }))}
        dutyNotes={duty?.notes ?? ""}
        approvedActivities={approvedActivities.map((a) => ({ id: a.id, title: a.title, date: a.date.toISOString().slice(0, 10) }))}
        activities={activities.map((a) => ({ id: a.id, title: a.title, body: a.body, evidence: a.evidence ?? "", date: a.createdAt.toISOString().slice(0, 10) }))}
      />
    </main>
  );
}
