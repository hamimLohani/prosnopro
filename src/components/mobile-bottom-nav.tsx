"use client";

import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLang } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import type { UserRole } from "@/lib/types";

interface MobileBottomNavProps {
  role: UserRole;
}

interface BottomNavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { lang } = useLang();

  const items: BottomNavItem[] =
    role === "teacher"
      ? [
          {
            href: "/teacher",
            label: pickText(lang, "আমার Exam", "My Exams"),
            exact: true,
            icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
          },
          {
            href: "/teacher/exams/new",
            label: pickText(lang, "নতুন Exam", "New Exam"),
            icon: <PlusCircle className="h-4 w-4 shrink-0" />,
          },
          {
            href: "/teacher/bank",
            label: pickText(lang, "ব্যাংক", "Bank"),
            icon: <BookOpen className="h-4 w-4 shrink-0" />,
          },
          {
            href: "/teacher/settings",
            label: pickText(lang, "সেটিংস", "Settings"),
            icon: <Settings className="h-4 w-4 shrink-0" />,
          },
        ]
      : [
          {
            href: "/student",
            label: pickText(lang, "জয়েন", "Join"),
            exact: true,
            icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
          },
          {
            href: "/student/results",
            label: pickText(lang, "রেজাল্ট", "Results"),
            icon: <ClipboardList className="h-4 w-4 shrink-0" />,
          },
          {
            href: "/student/practice",
            label: pickText(lang, "প্র্যাকটিস", "Practice"),
            icon: <Search className="h-4 w-4 shrink-0" />,
          },
        ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="mobile-bottom-nav no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div
        className={`mx-auto grid max-w-4xl ${
          items.length === 4 ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {items.map((item) => {
          const isTeacherExamDetail =
            item.href === "/teacher" &&
            pathname.startsWith("/teacher/exams/") &&
            !pathname.startsWith("/teacher/exams/new");
          const active = item.exact
            ? pathname === item.href || isTeacherExamDetail
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] leading-tight transition-colors ${
                active
                  ? "font-bold text-navy"
                  : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-navy/10 text-navy" : "text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
