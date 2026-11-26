import { prisma } from "../../../src/lib/db";
import { getCurrentUser, hasPermission } from "../../../src/lib/auth";
import { DEFAULT_SETTINGS, periodTimes, fmt, type TimetableSettings } from "../../../src/lib/timetable-settings";
import SettingsForm from "./SettingsForm";

// إعدادات الجدول الدراسي: أيام العمل، الحصص، الفسح، وتوزيع الفصول. تُحفظ داخل مدرسة المستخدم.
export default async function TimetableSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="page"><p>يجب تسجيل الدخول أولًا.</p></main>;
  if (!hasPermission(user, "timetable:manage")) return <main className="page"><p>ليست لديك صلاحية لإعدادات الجدول.</p></main>;

  const [row, classes] = await Promise.all([
    prisma.timetableSettings.findUnique({ where: { schoolId: user.schoolId } }),
    prisma.schoolClass.findMany({ where: { schoolId: user.schoolId }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const settings = (row?.data as TimetableSettings | undefined) ?? DEFAULT_SETTINGS;
  const sampleRecess1 = periodTimes(settings, settings.defaultPeriods, settings.recess1);
  const sampleRecess2 = settings.recess2Enabled ? periodTimes(settings, settings.defaultPeriods, settings.recess2) : null;

  return (
    <main className="page">
      <h1>إعدادات الجدول الدراسي</h1>
      <SettingsForm initial={settings} classes={classes.map((c) => c.name)} />
      <section className="card">
        <h2>أوقات الحصص بعد احتساب الفسح</h2>
        <table className="table">
          <thead><tr><th>الحصة</th><th>{settings.recess1.name}</th>{sampleRecess2 && <th>{settings.recess2.name}</th>}</tr></thead>
          <tbody>
            {sampleRecess1.map((p, i) => (
              <tr key={p.period}>
                <td>{p.period}</td>
                <td dir="ltr">{fmt(p.start)} - {fmt(p.end)}</td>
                {sampleRecess2 && <td dir="ltr">{fmt(sampleRecess2[i].start)} - {fmt(sampleRecess2[i].end)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
