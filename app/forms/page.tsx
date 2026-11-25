import Link from "next/link";
import { getCurrentUser, hasPermission } from "../../src/lib/auth";

const FORMS: { href: string; label: string }[] = [
  { href: "/forms/representatives", label: "كشف رواد الفصول" },
  { href: "/forms/learning", label: "كشف صعوبات التعلم" },
  { href: "/forms/speech", label: "كشف صعوبات النطق" },
  { href: "/forms/absence", label: "كشف الغياب اليومي" },
  { href: "/forms/leave", label: "كشف حضور وانصراف المستأذنين" },
  { href: "/forms/staff", label: "كشف المعلمين والإداريين" },
  { href: "/forms/oral-warning", label: "نموذج تنبيه شفهي" },
  { href: "/forms/behavior-pledge", label: "نموذج تعهد سلوكي" },
  { href: "/forms/guardian-notice", label: "إشعار ولي الأمر بمشكلة سلوكية" },
  { href: "/forms/guardian-invitation", label: "خطاب دعوة ولي الأمر" },
];

// فهرس النماذج المطبوعة. كل نموذج يُطبع من صفحته مباشرة.
export default async function FormsIndexPage() {
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
        <p>ليست لديك صلاحية لعرض النماذج.</p>
      </main>
    );
  }
  return (
    <main className="page">
      <h1>النماذج المطبوعة</h1>
      <ul className="list">
        {FORMS.map((f) => (
          <li key={f.href} className="card">
            <Link href={f.href}>{f.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
