"use client";

import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Home,
  Info,
  LayoutDashboard,
  LogIn,
  Menu,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import type { UserRole } from "@/lib/types";

interface MobileSidebarProps {
  userId: string | null;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  teacherCode: string | null;
}

interface SidebarLinkItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}

export function MobileSidebar({
  userId,
  name,
  email,
  role,
  teacherCode,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === pathname;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenForPath(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const homeHref = role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/";

  const links: SidebarLinkItem[] = [];
  if (userId && role === "teacher") {
    links.push(
      {
        href: "/teacher",
        label: "আমার Exam",
        exact: true,
        icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/teacher/exams/new",
        label: "নতুন Exam তৈরি",
        icon: <PlusCircle className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/teacher/bank",
        label: "Question Bank",
        icon: <BookOpen className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/teacher/settings",
        label: "Settings ও AI Key",
        icon: <Settings className="h-4 w-4 shrink-0" />,
      },
    );
  } else if (userId && role === "student") {
    links.push(
      {
        href: "/student",
        label: "Exam-এ জয়েন",
        exact: true,
        icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/student/results",
        label: "আমার Result",
        icon: <ClipboardList className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/student/practice",
        label: "Practice খুঁজুন",
        icon: <Search className="h-4 w-4 shrink-0" />,
      },
    );
  } else if (userId) {
    links.push({
      href: "/onboarding",
      label: "Account Setup সম্পন্ন করুন",
      icon: <UserPlus className="h-4 w-4 shrink-0" />,
    });
  } else {
    links.push(
      {
        href: "/",
        label: "হোম",
        exact: true,
        icon: <Home className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/login",
        label: "Sign in",
        icon: <LogIn className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/signup/student",
        label: "Student হিসেবে জয়েন",
        icon: <GraduationCap className="h-4 w-4 shrink-0" />,
      },
      {
        href: "/signup/teacher",
        label: "Teacher Account খুলুন",
        icon: <ShieldCheck className="h-4 w-4 shrink-0" />,
      },
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpenForPath(pathname)}
        className={
          userId
            ? "inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 sm:hidden cursor-pointer"
            : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 sm:hidden cursor-pointer"
        }
      >
        <Menu className={userId ? "h-4 w-4" : "h-5 w-5"} />
        {userId && <span>Menu</span>}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end h-dvh sm:hidden">
            <div
              onClick={() => setOpenForPath(null)}
              aria-hidden="true"
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
              className="relative z-10 flex h-dvh w-[285px] max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <BrandMark href={homeHref} size="sm" />
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setOpenForPath(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {userId && (
                <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{name ?? "Account"}</p>
                    {role && (
                      <span className="shrink-0 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
                        {role}
                      </span>
                    )}
                  </div>
                  {email && <p className="truncate text-xs text-slate-500">{email}</p>}
                  {role === "teacher" && teacherCode && (
                    <div className="flex items-center justify-between rounded-lg bg-navy px-2.5 py-1.5 text-xs text-white">
                      <span className="text-slate-300">Teacher Code</span>
                      <span className="font-mono font-bold tracking-wider text-amber">
                        {teacherCode}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <nav className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-3 space-y-1">
                {links.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpenForPath(null)}
                      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-navy font-semibold text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
                <Link
                  href="/about"
                  onClick={() => setOpenForPath(null)}
                  className={`flex min-h-[40px] items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                    pathname === "/about"
                      ? "bg-navy font-semibold text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Info className="h-4 w-4 shrink-0" />
                  <span>ProsnoPro সম্পর্কে (About)</span>
                </Link>
                <Link
                  href="/privacy"
                  onClick={() => setOpenForPath(null)}
                  className="flex min-h-[40px] items-center rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Privacy &amp; Data Notice
                </Link>
                {userId && <SignOutButton className="w-full justify-center min-h-[44px] text-sm" />}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
