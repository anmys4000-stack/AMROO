import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../src/lib/db";
import { readSessionToken } from "../src/lib/session";

// الصفحة الرئيسية: إن لم توجد جلسة صالحة يُعاد التوجيه إلى تسجيل الدخول.
// وإن كان المستخدم يجب أن يغيّر كلمة المرور المؤقتة يُعاد توجيهه إلى صفحة التغيير.
export default async function HomePage() {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>مرحبًا بك في AMROO</h1>
      <p>تم تسجيل دخولك. لوحة التحكم ستُبنى في المرحلة التالية.</p>
    </main>
  );
}
