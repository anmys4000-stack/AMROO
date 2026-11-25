import { redirect } from "next/navigation";

// مسار /dashboard كما في مسار: يحوّل إلى الصفحة الرئيسية التي هي لوحة التحكم.
export default function DashboardAliasPage() {
  redirect("/");
}
