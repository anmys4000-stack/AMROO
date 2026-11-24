"use client";

// زر طباعة قائمة نماذج الإنذار. يعتمد على طباعة المتصفح.
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      طباعة
    </button>
  );
}
