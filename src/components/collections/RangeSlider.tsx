"use client";

import React, { useRef } from "react";

export function RangeSlider({
  min, max, value, onChange, step, fieldType,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  step: number;
  fieldType: string;
}) {
  const rangeRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(value[0]);
  const rightPct = pct(value[1]);

  const fmt = (v: number) =>
    fieldType.startsWith("float")
      ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : Math.round(v).toLocaleString();

  const handlePointer = (idx: 0 | 1) => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = rangeRef.current;
    if (!el) return;
    const onMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      let raw = min + ratio * (max - min);
      raw = Math.round(raw / step) * step;
      raw = Math.max(min, Math.min(max, raw));
      const next: [number, number] = [...value] as [number, number];
      next[idx] = raw;
      if (next[0] > next[1]) { next[idx === 0 ? 1 : 0] = raw; }
      onChange(next);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <div className="px-1 pt-1 pb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{fmt(value[0])}</span>
        <span className="text-xs text-gray-400">—</span>
        <span className="text-xs font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{fmt(value[1])}</span>
      </div>
      <div ref={rangeRef} className="relative h-5 flex items-center cursor-pointer select-none touch-none">
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-brand rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        {/* Left thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-brand rounded-full shadow-sm hover:scale-110 transition-transform -translate-x-1/2"
          style={{ left: `${leftPct}%` }}
          onPointerDown={handlePointer(0)}
        />
        {/* Right thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-brand rounded-full shadow-sm hover:scale-110 transition-transform -translate-x-1/2"
          style={{ left: `${rightPct}%` }}
          onPointerDown={handlePointer(1)}
        />
      </div>
    </div>
  );
}
