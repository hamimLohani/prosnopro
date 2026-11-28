import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#162456",
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  return {
    title: {
      default: pickText(
        lang,
        "ProsnoPro — বাংলা ও English অনলাইন MCQ Exam",
        "ProsnoPro — Online MCQ Exam Platform",
      ),
      template: "%s | ProsnoPro",
    },
    description: pickText(
      lang,
      "শিক্ষক ও শিক্ষার্থীদের জন্য সহজ, দ্রুত এবং কম নেটওয়ার্কেও চলা বাংলা ও English অনলাইন MCQ Exam প্ল্যাটফর্ম।",
      "Simple, fast, offline-resilient online MCQ exam platform for school, college, and university teachers and students.",
    ),
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/logo-1.png",
      apple: "/logo-1.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ProsnoPro",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getServerLang();

  return (
    <html
      lang={lang}
      className={`${jakarta.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip bg-background text-foreground">
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
