"use client";

import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkIndicatorProps {
  children: ReactNode;
}

function NavLinkInner({ children }: NavLinkIndicatorProps) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-1.5">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-navy" />}
      <span>{children}</span>
    </span>
  );
}

interface NavLinkProps {
  href: string;
  exact?: boolean;
  className?: string;
  children: ReactNode;
}

export function NavLink({ href, exact = false, className = "", children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch={true}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
        isActive
          ? "bg-slate-100 font-semibold text-navy"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } ${className}`}
    >
      <NavLinkInner>{children}</NavLinkInner>
    </Link>
  );
}
