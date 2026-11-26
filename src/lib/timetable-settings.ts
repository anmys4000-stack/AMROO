// إعدادات الجدول الدراسي (على نسق مسار): أيام العمل، عدد الحصص لكل مرحلة ويوم، الفسح، وتوزيع الفصول عليها.
export type RecessSettings = { name: string; afterPeriod: number; minutes: number };
export type TimetableSettings = {
  workdays: number[]; // 0 = الأحد ... 6 = السبت
  defaultPeriods: number;
  periodMinutes: number;
  firstStart: string; // HH:MM
  breakMinutes: number; // الراحة بين الحصص
  stageDayPeriods: Record<string, Partial<Record<number, number>>>; // مرحلة -> يوم -> عدد الحصص
  recess1: RecessSettings;
  recess2Enabled: boolean;
  recess2: RecessSettings;
  classRecess: Record<string, 1 | 2>; // اسم الفصل -> الفسحة الأولى أو الثانية
};

export const DEFAULT_SETTINGS: TimetableSettings = {
  workdays: [0, 1, 2, 3, 4],
  defaultPeriods: 7,
  periodMinutes: 45,
  firstStart: "07:45",
  breakMinutes: 1,
  stageDayPeriods: {},
  recess1: { name: "الفسحة الأولى", afterPeriod: 2, minutes: 30 },
  recess2Enabled: false,
  recess2: { name: "الفسحة الثانية", afterPeriod: 3, minutes: 30 },
  classRecess: {},
};

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

// التحقق من الإعدادات قبل الحفظ. تعيد نص الخطأ أو null.
export function validateSettings(v: unknown): string | null {
  if (!v || typeof v !== "object") return "الإعدادات غير صالحة";
  const s = v as TimetableSettings;
  if (!Array.isArray(s.workdays) || s.workdays.length === 0 || s.workdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "أيام العمل غير صالحة";
  if (!Number.isInteger(s.defaultPeriods) || s.defaultPeriods < 1 || s.defaultPeriods > 10) return "عدد الحصص الافتراضي بين 1 و10";
  if (!Number.isInteger(s.periodMinutes) || s.periodMinutes < 15 || s.periodMinutes > 90) return "مدة الحصة بين 15 و90 دقيقة";
  if (typeof s.firstStart !== "string" || !HM.test(s.firstStart)) return "وقت بداية الحصة غير صالح";
  if (!Number.isInteger(s.breakMinutes) || s.breakMinutes < 0 || s.breakMinutes > 30) return "وقت الراحة بين 0 و30 دقيقة";
  for (const r of [s.recess1, s.recess2]) {
    if (!r || !Number.isInteger(r.afterPeriod) || r.afterPeriod < 1 || r.afterPeriod > 10) return "موضع الفسحة غير صالح";
    if (!Number.isInteger(r.minutes) || r.minutes < 0 || r.minutes > 90) return "مدة الفسحة غير صالحة";
  }
  return null;
}

// أوقات الحصص بعد احتساب الفسح والراحة. تُرجع قائمة لكل حصة: بداية ونهاية بالدقائق من منتصف الليل.
export function periodTimes(s: TimetableSettings, periods: number, recess: RecessSettings | null) {
  const [h, m] = s.firstStart.split(":").map(Number);
  let t = h * 60 + m;
  const out: { period: number; start: number; end: number }[] = [];
  for (let p = 1; p <= periods; p++) {
    const start = t;
    const end = t + s.periodMinutes;
    out.push({ period: p, start, end });
    t = end;
    if (recess && recess.afterPeriod === p) t += recess.minutes;
    else if (p < periods) t += s.breakMinutes;
  }
  return out;
}

export function fmt(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
