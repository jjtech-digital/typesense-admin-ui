"use client";

// ── Toggle Switch ────────────────────────────────────────────────────

export function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand" : "bg-gray-300"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      }`} />
    </button>
  );
}
