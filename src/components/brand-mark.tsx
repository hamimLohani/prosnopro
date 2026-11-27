import Image from "next/image";
import Link from "next/link";

interface BrandMarkProps {
  href?: string;
  inverted?: boolean;
  size?: "sm" | "md";
}

export function BrandMark({ href = "/", inverted = false, size = "md" }: BrandMarkProps) {
  const dimension = size === "sm" ? 32 : 38;
  const src = inverted ? "/logo-2.png" : "/logo-1.png";

  const content = (
    <span className="inline-flex items-center gap-2.5 select-none">
      <Image
        src={src}
        alt="ProsnoPro logo"
        width={dimension}
        height={dimension}
        className="rounded-lg shrink-0"
        priority
      />
      <span className="flex flex-col leading-none">
        <span
          className={`font-bold tracking-tight ${
            size === "sm" ? "text-base" : "text-lg"
          } ${inverted ? "text-white" : "text-navy"}`}
        >
          Prosno<span className="text-amber">Pro</span>
        </span>
        <span
          className={`text-[10px] font-medium ${
            inverted ? "text-slate-300" : "text-slate-500"
          }`}
        >
          প্রশ্নপ্রো • Online Exam
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
