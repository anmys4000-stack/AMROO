import { getCurrentUser, hasPermission } from "../../src/lib/auth";
import { VIOLATIONS_GUIDE } from "../../src/lib/violations-guide";

// دليل المخالفات السلوكية الرسمي: بحث وتصفية حسب الدرجة والمرحلة والنمط، مع نقاط الحسم.
export default async function ViolationGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; degree?: string; stage?: string; mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  if (!hasPermission(user, "behavior:record")) {
    return (
      <main className="page">
        <p>ليست لديك صلاحية لعرض دليل المخالفات.</p>
      </main>
    );
  }

  const { q = "", degree = "", stage = "", mode = "" } = await searchParams;
  const term = q.trim();
  const rows = VIOLATIONS_GUIDE.filter(
    (v) =>
      (!term || v.description.includes(term)) &&
      (!degree || String(v.degree) === degree) &&
      (!stage || v.stage === stage) &&
      (!mode || v.mode === mode),
  );

  return (
    <main className="page">
      <h1>دليل المخالفات السلوكية</h1>
      <p>مطابق لقواعد السلوك والمواظبة (الإصدار الخامس 1447هـ) — {VIOLATIONS_GUIDE.length} بندًا.</p>
      <form method="GET" className="card no-print">
        <input name="q" defaultValue={term} placeholder="ابحث في وصف المخالفة" />
        <select name="degree" defaultValue={degree}>
          <option value="">كل الدرجات</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>الدرجة {d}</option>
          ))}
        </select>
        <select name="stage" defaultValue={stage}>
          <option value="">كل المراحل</option>
          <option value="ابتدائي">ابتدائي</option>
          <option value="متوسط وثانوي">متوسط وثانوي</option>
          <option value="جميع المراحل">جميع المراحل</option>
        </select>
        <select name="mode" defaultValue={mode}>
          <option value="">كل الأنماط</option>
          <option value="حضوري">حضوري</option>
          <option value="تعليم عن بعد">تعليم عن بعد</option>
        </select>
        <button type="submit">تصفية</button>
      </form>
      <p>النتائج: {rows.length}</p>
      <table className="table">
        <thead>
          <tr>
            <th>الوصف</th>
            <th>المرحلة</th>
            <th>النمط</th>
            <th>الدرجة</th>
            <th>الحسم</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v, i) => (
            <tr key={`${v.description}-${v.stage}-${v.mode}-${i}`}>
              <td>{v.description}</td>
              <td>{v.stage}</td>
              <td>{v.mode}</td>
              <td>{v.degree}</td>
              <td>{v.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
