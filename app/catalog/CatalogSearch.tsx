"use client";

import { useState } from "react";
import type { CatalogItem } from "../../src/lib/catalog";

// بحث فوري في فهرس النماذج والإجراءات بالاسم أو القسم أو الكلمات الدالة.
export default function CatalogSearch({ items }: { items: CatalogItem[] }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const shown = term ? items.filter((i) => `${i.title} ${i.section} ${i.keywords ?? ""}`.includes(term)) : items;
  return (
    <>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم النموذج أو الإجراء" aria-label="بحث" />
      <p>{shown.length} نتيجة</p>
      <ul className="list">
        {shown.map((i) => (
          <li key={i.href} className="card row">
            <a href={i.href}>{i.title}</a>
            <small>{i.section}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
