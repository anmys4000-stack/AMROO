import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken } from "../src/lib/session";

// الصفحة الرئيسية: إن لم توجد جلسة صالحة يُعاد التوجيه إلى تسجيل الدخول.
export default async function HomePage() {
  const store = await cookies();
  const token = store.get("amroo_session")?.value;
  const session = token ? readSessionToken(token) : null;
  if (!session) redirect("/login");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>مرحبًا بك في AMROO</h1>
      <p>تم تسجيل دخولك. لوحة التحكم ستُبنى في المرحلة التالية.</p>
    </main>
  );
}
