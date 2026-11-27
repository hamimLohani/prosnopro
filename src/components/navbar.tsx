import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import type { CurrentUserContext } from "@/lib/types";

interface NavbarProps {
  ctx?: CurrentUserContext | null;
}

export function Navbar({ ctx }: NavbarProps) {
  const role = ctx?.profile?.role;
  const dashboardHref =
    role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/onboarding";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <BrandMark href={ctx?.userId ? dashboardHref : "/"} />

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <NavLink href="/tools/bangla-spike" className="hidden sm:inline-flex">
            Bangla PDF Spike
          </NavLink>

          {ctx?.userId ? (
            <>
              <NavLink href={dashboardHref} exact>
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
                </>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-navy px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-navy-strong"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>

      {ctx?.userId && ctx.profile && (
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs">
          {role === "teacher" ? (
            <>
              <NavLink href="/teacher" exact className="shrink-0 text-xs">
                Exams
              </NavLink>
              <NavLink href="/teacher/bank" className="shrink-0 text-xs">
                Question Bank
              </NavLink>
              <NavLink href="/teacher/settings" className="shrink-0 text-xs">
                Settings
              </NavLink>
              <NavLink href="/tools/bangla-spike" className="shrink-0 text-xs">
                Bangla Spike
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/student" exact className="shrink-0 text-xs">
                Join Exam
              </NavLink>
              <NavLink href="/student/results" className="shrink-0 text-xs">
                My Results
              </NavLink>
              <NavLink href="/student/practice" className="shrink-0 text-xs">
                Practice
              </NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
