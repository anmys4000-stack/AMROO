import { getCurrentUser } from "../../src/lib/auth";
import { CATALOG } from "../../src/lib/catalog";
import CatalogSearch from "./CatalogSearch";

// قسم جميع النماذج والإجراءات، مع بحث بالاسم.
export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="page">
        <p>يجب تسجيل الدخول أولًا.</p>
      </main>
    );
  }
  return (
    <main className="page">
      <h1>النماذج والإجراءات</h1>
      <CatalogSearch items={CATALOG} />
    </main>
  );
}
