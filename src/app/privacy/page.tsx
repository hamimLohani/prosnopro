import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { pickText } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const [ctx, lang] = await Promise.all([getCurrentUserContext(), getServerLang()]);
  const t = (bn: string, en: string) => pickText(lang, bn, en);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-navy">Privacy &amp; Data Retention Notice</h1>
          <p className="text-sm text-slate-600">
            {t(
              "ProsnoPro কীভাবে Teacher, Student এবং Exam Integrity ডেটা সংরক্ষণ করে।",
              "How ProsnoPro stores and protects Teacher, Student, and Exam Integrity data.",
            )}
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 text-sm leading-relaxed text-slate-700">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {t("1. Account তথ্য", "1. Account Information")}
            </h2>
            <p>
              {t(
                "ProsnoPro আপনার নাম, Email, Role (Teacher বা Student) এবং ঐচ্ছিক Student Roll/ID ও Institution সংরক্ষণ করে। পরীক্ষার সঠিক রেকর্ড রাখার জন্য Student-এর নাম ও Roll পরীক্ষার Attempt-এ যুক্ত থাকে।",
                "ProsnoPro stores your name, email, role (Teacher or Student), and optional Student Roll/ID and institution. Student name and roll are attached to exam attempts for accurate grading records.",
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {t("2. Exam Integrity ও Device Log", "2. Exam Integrity & Device Logs")}
            </h2>
            <p>
              {t(
                "টাইমড Exam চলাকালে ProsnoPro সময়, উত্তর, IP address, Browser তথ্য, Session takeover (একাধিক ট্যাব/ডিভাইস) এবং Tab switch / Window blur / Away duration সংক্রান্ত তথ্য সংরক্ষণ করে। এগুলো কেবল সংশ্লিষ্ট Teacher দেখতে পারেন।",
                "During timed exams, ProsnoPro logs timestamps, answers, IP address, browser info, session takeovers, and tab switch / window blur / away duration metrics. Only the exam's teacher can view these.",
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {t("3. Teacher AI Key ও PDF", "3. Teacher AI Keys & PDFs")}
            </h2>
            <p>
              {t(
                "Teacher-রা চাইলে নিজস্ব AI API Key যুক্ত করতে পারেন। Key-গুলো AES-256-GCM দিয়ে Encrypted থাকে এবং কেবল Server-এ ব্যবহৃত হয় — কখনো Browser-এ ফেরত পাঠানো হয় না। PDF প্রশ্ন Import কেবল Extraction-এর সময় ব্যবহৃত হয় এবং Server-এ সংরক্ষিত থাকে না।",
                "Teachers may optionally add their own AI API key. Keys are encrypted with AES-256-GCM and used only server-side — never sent back to the browser. PDF imports are processed transiently and not stored on the server.",
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {t("4. অপ্রাপ্তবয়স্ক শিক্ষার্থী", "4. Minor Students")}
            </h2>
            <p>
              {t(
                "প্রযোজ্য আইন অনুযায়ী অপ্রাপ্তবয়স্ক শিক্ষার্থীদের Account খোলার আগে অভিভাবক বা প্রতিষ্ঠানের অনুমতি নেওয়ার দায়িত্ব সংশ্লিষ্ট Teacher বা প্রতিষ্ঠানের।",
                "Teachers or institutions are responsible for obtaining parent/guardian or institutional consent where required by law before minor students create accounts.",
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {t("5. Retention ও Deletion", "5. Retention & Deletion")}
            </h2>
            <p>
              {t(
                "ভুল Code এন্ট্রির Rate-limit রেকর্ড ৭ দিন পর এবং Raw entry log ৯০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়। Teacher-রা যেকোনো সময় Dashboard থেকে তাদের Exam ও Question Bank মুছতে পারেন।",
                "Rate-limit records expire after 7 days and raw entry logs after 90 days. Teachers can delete their exams and Question Bank items from the dashboard at any time.",
              )}
            </p>
          </div>
        </section>

        <div>
          <Link href="/" className="text-sm font-semibold text-navy hover:underline">
            {t("← হোম পেজে ফিরে যান", "← Back to Home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
