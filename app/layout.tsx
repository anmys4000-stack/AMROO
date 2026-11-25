import type { ReactNode } from "react";
import { getCurrentUser } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import AdminShell from "../src/components/AdminShell";

export const metadata = {
  title: "AMROO - منصّة إدارة مدرسية",
  description: "منصّة إدارة مدرسية رقمية",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // الهيكل الجانبي للإدارة فقط؛ المعلم وولي الأمر وصفحات الدخول تبقى بتصميمها الحالي.
  const current = await getCurrentUser();
  const showShell = !!current && current.role !== "TEACHER" && current.role !== "GUARDIAN";
  const me = showShell ? await prisma.user.findUnique({ where: { id: current!.id }, select: { fullName: true } }) : null;
  return (
    <html lang="ar" dir="rtl">
      <body>
        {showShell && me ? <AdminShell fullName={me.fullName} role={current!.role}>{children}</AdminShell> : children}
        <style>{`
          :root { color-scheme: light dark; }
          body { margin: 0; font-family: system-ui, sans-serif; background: #f4f6f8; color: #1d2733; }
          .login { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
          .card { width: 100%; max-width: 380px; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,.08); display: grid; gap: 8px; }
          h1 { margin: 0; font-size: 22px; }
          .sub { margin: 0 0 12px; color: #5b6878; font-size: 14px; }
          label { font-size: 14px; margin-top: 6px; }
          input { padding: 10px 12px; border: 1px solid #c9d1db; border-radius: 8px; font-size: 16px; }
          input:focus { outline: 2px solid #2563eb; border-color: transparent; }
          button { margin-top: 12px; padding: 12px; border: 0; border-radius: 8px; background: #1e4fbf; color: #fff; font-size: 16px; cursor: pointer; }
          button:disabled { opacity: .6; cursor: default; }
          .error { color: #b42318; font-size: 14px; margin: 4px 0 0; }
          @media (prefers-color-scheme: dark) {
            body { background: #111820; color: #e6ebf1; }
            .card { background: #1a2430; box-shadow: none; }
            input { background: #111820; color: #e6ebf1; border-color: #34414f; }
            .sub { color: #9aa7b6; }
          }
        `}</style>
      </body>
    </html>
  );
}
