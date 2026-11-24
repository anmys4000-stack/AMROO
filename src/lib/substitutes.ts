// توزيع حصص الانتظار: حصص المعلمين الغائبين في يوم معيّن توزَّع على المعلمين المتاحين.
// المعلم المتاح: نشط، وليس في استئذان معتمد لذلك اليوم، ولا يُدرِّس في تلك الحصة.
// التوزيع جشع: يُسند كل حصة إلى المتاح الأقل حملًا من حصص الانتظار حتى الآن.

export type Lesson = {
  classId: string;
  className: string;
  weekday: number;
  period: number;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
};

export type Teacher = { id: string; fullName: string };

export type Proposal = {
  classId: string;
  className: string;
  period: number;
  subject: string;
  absentName: string;
  substituteId: string | null;
  substituteName: string | null;
};

// يطابق معلمًا بحصة: إما بالمعرّف المربوط، أو بالاسم المكتوب.
function teaches(lesson: Lesson, teacher: Teacher): boolean {
  return lesson.teacherId === teacher.id || (lesson.teacherId === null && lesson.teacherName === teacher.fullName);
}

export function distribute(args: {
  weekday: number;
  absent: Teacher[];
  available: Teacher[];
  lessons: Lesson[];
}): Proposal[] {
  const { weekday, absent, available, lessons } = args;
  const load = new Map<string, number>(available.map((t) => [t.id, 0]));

  const todays = lessons
    .filter((l) => l.weekday === weekday)
    .filter((l) => absent.some((a) => teaches(l, a)))
    .sort((a, b) => a.period - b.period);

  return todays.map((l) => {
    const absentTeacher = absent.find((a) => teaches(l, a));
    const busy = (t: Teacher) => lessons.some((x) => x.weekday === weekday && x.period === l.period && teaches(x, t));
    const candidates = available.filter((t) => !busy(t));
    candidates.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0));
    const pick = candidates[0] ?? null;
    if (pick) load.set(pick.id, (load.get(pick.id) ?? 0) + 1);
    return {
      classId: l.classId,
      className: l.className,
      period: l.period,
      subject: l.subject,
      absentName: absentTeacher?.fullName ?? "",
      substituteId: pick?.id ?? null,
      substituteName: pick?.fullName ?? null,
    };
  });
}
