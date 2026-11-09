import type { ReactNode } from "react";

// Small settings pills shared by the Video Ad and Image Ad forms (2026-11-10): a muted label, then
// the current choice in a native select. Native on purpose — it opens the phone's own picker.
export function PillSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9.5rem] cursor-pointer truncate bg-transparent text-xs font-semibold text-foreground focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}
