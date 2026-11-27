import { Plus } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import type { CurrentUserContext } from "@/lib/types";

interface NavbarProps {
  ctx?: CurrentUserContext | null;
}

export function Navbar({ ctx }: NavbarProps) {
  const role = ctx?.profile?.role ?? null;
  const dashboardHref =
    role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/onboarding";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 sm:min-h-16 max-w-5xl items-center justify-between gap-2 sm:gap-4 px-3 py-1.5 sm:px-4 sm:py-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MobileSidebar
            userId={ctx?.userId ?? null}
            name={ctx?.profile?.name ?? null}
            email={ctx?.email ?? null}
            role={role}
            teacherCode={ctx?.teacherProfile?.teacher_code ?? null}
          />
          <BrandMark href={ctx?.userId ? dashboardHref : "/"} />
        </div>

        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <NavLink href="/tools/bangla-spike" className="hidden sm:inline-flex">
            Bangla PDF Spike
          </NavLink>

          {ctx?.userId ? (
            <>
              <NavLink
                href={dashboardHref}
                exact
                className={ctx.profile ? "hidden sm:inline-flex" : "inline-flex"}
              >
                {ctx.profile ? (role === "teacher" ? "Teacher Home" : "Student Home") : "Finish Setup"}
              </NavLink>

              {role === "teacher" && (
                <>
                  <NavLink href="/teacher/bank" className="hidden sm:inline-flex">
                    Question Bank
                  </NavLink>
                  <NavLink href="/teacher/settings" className="hidden sm:inline-flex">
                    Settings
                  </NavLink>
                  <Link
                    href="/teacher/exams/new"
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong sm:hidden whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Exam</span>
                  </Link>
                </>
              )}

              {role === "student" && (
                <>
                  <NavLink href="/student/results" className="hidden sm:inline-flex">
                    My Results
                  </NavLink>
                  <NavLink href="/student/practice" className="hidden sm:inline-flex">
                    Practice
                  </NavLink>
                  <Link
                    href="/student/results"
                    className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50 sm:hidden whitespace-nowrap"
                  >
                    Results
                  </Link>
                </>
              )}
              <SignOutButton className={ctx.profile ? "hidden sm:inline-flex" : ""} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-[36px] sm:min-h-[38px] items-center rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-[36px] sm:min-h-[38px] items-center rounded-lg bg-navy px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-navy-strong whitespace-nowrap"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
