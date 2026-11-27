import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import type { CurrentUserContext } from "@/lib/types";

interface NavbarProps {
  ctx?: CurrentUserContext | null;
}

export function Navbar({ ctx }: NavbarProps) {
  const role = ctx?.profile?.role;
  const dashboardHref = role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/onboarding";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <BrandMark href={ctx?.userId ? dashboardHref : "/"} />

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/tools/bangla-spike"
            className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Bangla PDF Spike
          </Link>

          {ctx?.userId ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-navy hover:bg-slate-200"
              >
                {ctx.profile ? (role === "teacher" ? "Teacher Home" : "Student Home") : "Finish Setup"}
              </Link>
              {role === "teacher" && (
                <>
                  <Link
                    href="/teacher/bank"
                    className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Question Bank
                  </Link>
                  <Link
                    href="/teacher/settings"
                    className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Settings
                  </Link>
                </>
              )}
              {role === "student" && (
                <>
                  <Link
                    href="/student/results"
                    className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    My Results
                  </Link>
                  <Link
                    href="/student/practice"
                    className="hidden sm:inline-flex rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Practice
                  </Link>
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
        <div className="flex sm:hidden items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs">
          {role === "teacher" ? (
            <>
              <Link href="/teacher" className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-navy">
                Exams
              </Link>
              <Link href="/teacher/bank" className="shrink-0 rounded-md px-2.5 py-1 font-medium text-slate-600">
                Question Bank
              </Link>
              <Link href="/teacher/settings" className="shrink-0 rounded-md px-2.5 py-1 font-medium text-slate-600">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/student" className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-navy">
                Join Exam
              </Link>
              <Link href="/student/results" className="shrink-0 rounded-md px-2.5 py-1 font-medium text-slate-600">
                My Results
              </Link>
              <Link href="/student/practice" className="shrink-0 rounded-md px-2.5 py-1 font-medium text-slate-600">
                Practice
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
