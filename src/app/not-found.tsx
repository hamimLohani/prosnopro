import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto inline-flex rounded-2xl bg-navy/10 p-3 text-navy">
            <FileQuestion className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">404</p>
            <h1 className="text-xl font-bold text-navy">পেজটি পাওয়া যায়নি</h1>
            <p className="text-sm text-slate-600">
              আপনি যে লিংকটি খুঁজছেন তা সরানো হয়েছে অথবা ঠিকানাটি সঠিক নয়।
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
          >
            Home-এ ফিরে যান
          </Link>
        </div>
      </main>
    </div>
  );
}
