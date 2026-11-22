"use client";

import { FormEvent, useState } from "react";

type Summary = {
  kind: string;
  rowsRead: number;
  toImport: number;
  skippedStudents: number;
  teachersWithoutEmail: number;
  classes: number;
};

export default function ImportPage() {
  const [kind, setKind] = useState<"students" | "teachers">("students");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Summary | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [passwordsCsv, setPasswordsCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(mode: "preview" | "commit", event?: FormEvent) {
    event?.preventDefault();
    if (!file) {
      setError("اختر ملفًا أولًا");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const body = new FormData();
      body.append("kind", kind);
      body.append("mode", mode);
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | { preview?: Summary; result?: Record<string, number>; passwordsCsv?: string | null; error?: string }
        | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "تعذّر الاستيراد");
        return;
      }
      if (data.preview) {
        setPreview(data.preview);
        setResult(null);
        setPasswordsCsv(null);
      }
      if (data.result) {
        setResult(
          Object.entries(data.result)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n"),
        );
        setPasswordsCsv(data.passwordsCsv ?? null);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setPending(false);
    }
  }

  function downloadPasswords() {
    if (!passwordsCsv) return;
    const blob = new Blob(["﻿" + passwordsCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher-passwords.csv";
    a.click();
    URL.revokeObjectURL(url);
    setPasswordsCsv(null);
  }

  return (
    <main className="page">
      <h1>استيراد من نظام نور</h1>
      <p className="sub">
        ارفع ملف Excel، وراجع المعاينة قبل الاعتماد. لا يُستورد السجل المدني أبدًا. يُجبر كل معلم على تغيير كلمة
        مروره المؤقتة عند أول دخول.
      </p>

      <form className="card" onSubmit={(e) => send("preview", e)}>
        <label htmlFor="kind">نوع الملف</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as "students" | "teachers")}>
          <option value="students">الطلاب</option>
          <option value="teachers">المعلمون</option>
        </select>

        <label htmlFor="file">ملف Excel</label>
        <input id="file" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <button type="submit" disabled={pending || !file}>
          {pending ? "جارٍ المعالجة..." : "معاينة"}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {preview && (
        <section className="card">
          <h2>المعاينة</h2>
          <ul>
            <li>صفوف في الملف: {preview.rowsRead}</li>
            <li>سيُستورد: {preview.toImport}</li>
            {preview.kind === "students" && <li>فصول ستُنشأ أو تُستخدم: {preview.classes}</li>}
            {preview.kind === "students" && <li>صفوف ناقصة تُتخطى: {preview.skippedStudents}</li>}
            {preview.kind === "teachers" && <li>بلا بريد إلكتروني فلا يُنشأ لهم حساب: {preview.teachersWithoutEmail}</li>}
          </ul>
          <button type="button" disabled={pending} onClick={() => send("commit")}>
            اعتماد الاستيراد
          </button>
        </section>
      )}

      {result && (
        <section className="card">
          <h2>تم الاستيراد</h2>
          <pre>{result}</pre>
        </section>
      )}

      {passwordsCsv && (
        <section className="card">
          <h2>كلمات المرور المؤقتة للمعلمين</h2>
          <p>تُعرض مرة واحدة فقط. نزّل الملف الآن، ووزّعه على المعلمين بطريقة آمنة، ثم احذفه.</p>
          <button type="button" onClick={downloadPasswords}>
            تنزيل الملف
          </button>
        </section>
      )}
    </main>
  );
}
