import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "ProsnoPro — Timed Bangla & English Online Exams",
    template: "%s | ProsnoPro",
  },
  description:
    "Simple, fair, low-bandwidth online MCQ exam platform for teachers and students in Bangla and English.",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
