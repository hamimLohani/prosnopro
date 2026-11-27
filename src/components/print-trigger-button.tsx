"use client";

import { Printer } from "lucide-react";

export function PrintTriggerButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-strong cursor-pointer"
    >
      <Printer className="h-4 w-4" />
      <span>Print / Save as PDF</span>
    </button>
  );
}
