import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LanguageToggle } from "@/components/language-toggle";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import type { CurrentUserContext } from "@/lib/types";

interface NavbarProps {
  ctx?: CurrentUserContext | null;
}

export async function Navbar({ ctx }: NavbarProps) {
  const lang = await getServerLang();
  const role = ctx?.profile?.role ?? null;
  const dashboardHref =
    role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/onboarding";

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 sm:min-h-16 max-w-4xl items-center justify-between gap-2 sm:gap-4 px-3 py-1.5 sm:px-4 sm:py-0">
          <BrandMark href={ctx?.userId ? dashboardHref : "/"} />

          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {ctx?.userId ? (
              <>
                <NavLink
                  href={dashboardHref}
                  exact
                  className={ctx.profile ? "hidden sm:inline-flex" : "inline-flex"}
                >
                  {ctx.profile
                    ? role === "teacher"
                      ? pickText(lang, "হোম", "Teacher Home")
                      : pickText(lang, "হোম", "Student Home")
                    : pickText(lang, "Setup সম্পন্ন করুন", "Complete Setup")}
                </NavLink>

                {role === "teacher" && (
                  <>
                    <NavLink href="/teacher/bank" className="hidden sm:inline-flex">
                      {pickText(lang, "প্রশ্ন ব্যাংক", "Question Bank")}
                    </NavLink>
                    <NavLink href="/teacher/settings" className="hidden sm:inline-flex">
                      {pickText(lang, "সেটিংস", "Settings")}
                    </NavLink>
                  </>
                )}

                {role === "student" && (
                  <>
                    <NavLink href="/student/results" className="hidden sm:inline-flex">
                      {pickText(lang, "আমার Result", "My Results")}
                    </NavLink>
                    <NavLink href="/student/practice" className="hidden sm:inline-flex">
                      {pickText(lang, "প্র্যাকটিস", "Practice")}
                    </NavLink>
                    <NavLink href="/student/settings" className="hidden sm:inline-flex">
                      {pickText(lang, "প্রোফাইল", "Profile")}
                    </NavLink>
                  </>
                )}

                <NavLink href="/about" className="hidden sm:inline-flex">
                  {pickText(lang, "সম্পর্কে", "About")}
                </NavLink>
                <LanguageToggle />
                <SignOutButton className={ctx.profile ? "hidden sm:inline-flex" : ""} />
                <MobileNavMenu signedIn={true} role={role} />
              </>
            ) : (
              <>
                <NavLink href="/about" className="hidden sm:inline-flex">
                  {pickText(lang, "সম্পর্কে", "About")}
                </NavLink>
                <LanguageToggle />
                <Link
                  href="/signup"
                  className="inline-flex min-h-[36px] sm:min-h-[38px] items-center rounded-lg bg-navy px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-navy-strong whitespace-nowrap"
                >
                  {pickText(lang, "শুরু করুন", "Get Started")}
                </Link>
                <MobileNavMenu signedIn={false} role={null} />
              </>
            )}
          </nav>
        </div>
      </header>
      {ctx?.userId && (role === "teacher" || role === "student") && (
        <MobileBottomNav role={role} />
      )}
    </>
  );
}
