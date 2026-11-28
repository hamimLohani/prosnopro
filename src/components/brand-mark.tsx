"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";

interface BrandMarkProps {
  href?: string;
  inverted?: boolean;
  size?: "sm" | "md";
}

export function BrandMark({ href = "/", inverted = false, size = "md" }: BrandMarkProps) {
  const { lang } = useLang();
  const dimension = size === "sm" ? 32 : 38;
  const src = inverted ? "/logo-2.png" : "/logo-1.png";

  const content = (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5 select-none">
      <Image
        src={src}
        alt="ProsnoPro logo"
        width={dimension}
        height={dimension}
        className={
          size === "sm"
            ? "h-8 w-8 rounded-lg shrink-0"
            : "h-8 w-8 sm:h-[38px] sm:w-[38px] rounded-lg shrink-0"
        }
        priority
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={`font-bold tracking-tight ${
            size === "sm" ? "text-base" : "text-base sm:text-lg"
          } ${inverted ? "text-white" : "text-navy"}`}
        >
          Prosno<span className="text-amber">Pro</span>
        </span>
        <span
          className={`hidden min-[360px]:block truncate text-[9px] sm:text-[10px] font-medium ${
            inverted ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {pickText(lang, "প্রশ্নপ্রো • Online Exam", "Online MCQ Exam")}
        </span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center focus:outline-none">
      {content}
    </Link>
  );
}

