import { prisma } from "../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import MessageForm from "./MessageForm";

// الرسائل: الإدارة ترسل لأولياء الأمور وتقرأ السجل، وولي الأمر يقرأ رسائل أبنائه فقط.
export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }

  const isGuardian = user.role === "GUARDIAN";
  const canSend = hasPermission(user, "students:manage");
  if (!isGuardian && !hasPermission(user, "students:view")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض الرسائل.</p>
      </main>
    );
  }

  const messages = await prisma.message.findMany({
    where: isGuardian
      ? { schoolId: user.schoolId, student: { guardianId: user.id } }
      : { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, body: true, createdAt: true, student: { select: { fullName: true } } },
  });

  // نقاط الأبناء التحفيزية تظهر لولي الأمر فقط، ولأبنائه المرتبطين به.
  const children = isGuardian
    ? await prisma.student.findMany({
        where: { schoolId: user.schoolId, guardianId: user.id, isActive: true },
        select: { id: true, fullName: true, pointsAwards: { select: { points: true } } },
        orderBy: { fullName: "asc" },
      })
    : [];

  const students = canSend
    ? await prisma.student.findMany({
        where: { schoolId: user.schoolId, isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
        take: 500,
      })
    : [];

  return (
    <main className="page">
      <h1>الرسائل</h1>
      {isGuardian && (
        <section className="card">
          <h2>نقاط أبنائي التحفيزية</h2>
          {children.length === 0 ? (
            <p>لا يوجد أبناء مرتبطون بحسابك.</p>
          ) : (
            <ul className="list">
              {children.map((c) => (
                <li key={c.id} className="row">
                  <span>{c.fullName}</span>
                  <span>{c.pointsAwards.reduce((sum, a) => sum + a.points, 0)} نقطة</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {canSend && <MessageForm students={students} />}
      {messages.length === 0 ? (
        <p>لا توجد رسائل بعد.</p>
      ) : (
        <ul className="list">
          {messages.map((m) => (
            <li key={m.id} className="card">
              <strong>{m.student.fullName}</strong>
              <p>{m.body}</p>
              <small dir="ltr">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
