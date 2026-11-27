import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUserContext } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const ctx = await getCurrentUserContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar ctx={ctx} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-navy">Privacy &amp; Data Retention Notice</h1>
          <p className="text-sm text-slate-600">
            ProsnoPro কীভাবে Teacher, Student এবং Exam Integrity ডেটা সংরক্ষণ করে।
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 text-sm leading-relaxed text-slate-700">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">1. Account তথ্য</h2>
            <p>
              ProsnoPro আপনার নাম, Email, Role (Teacher বা Student) এবং ঐচ্ছিক Student Roll/ID ও
              Institution সংরক্ষণ করে। পরীক্ষার সঠিক রেকর্ড রাখার জন্য Student-এর নাম ও Roll পরীক্ষার
              Attempt-এ যুক্ত থাকে।
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">2. Exam Integrity ও Device Log</h2>
            <p>
              টাইমড Exam চলাকালে ProsnoPro সময়, উত্তর, IP address, Browser তথ্য, Session takeover
              (একাধিক ট্যাব/ডিভাইস) এবং Tab switch / Window blur / Away duration সংক্রান্ত তথ্য
              সংরক্ষণ করে। এগুলো কেবল সংশ্লিষ্ট Teacher দেখতে পারেন।
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">3. Teacher AI Key ও PDF</h2>
            <p>
              Teacher-রা চাইলে নিজস্ব AI API Key যুক্ত করতে পারেন। Key-গুলো AES-256-GCM দিয়ে
              Encrypted থাকে এবং কেবল Server-এ ব্যবহৃত হয় — কখনো Browser-এ ফেরত পাঠানো হয় না। PDF
              প্রশ্ন Import কেবল Extraction-এর সময় ব্যবহৃত হয় এবং Server-এ সংরক্ষিত থাকে না।
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">4. অপ্রাপ্তবয়স্ক শিক্ষার্থী</h2>
            <p>
              প্রযোজ্য আইন অনুযায়ী অপ্রাপ্তবয়স্ক শিক্ষার্থীদের Account খোলার আগে অভিভাবক বা প্রতিষ্ঠানের
              অনুমতি নেওয়ার দায়িত্ব সংশ্লিষ্ট Teacher বা প্রতিষ্ঠানের।
            </p>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">5. Retention ও Deletion</h2>
            <p>
              ভুল Code এন্ট্রির Rate-limit রেকর্ড ৭ দিন পর এবং Raw entry log ৯০ দিন পর স্বয়ংক্রিয়ভাবে
              মুছে যায়। Teacher-রা যেকোনো সময় Dashboard থেকে তাদের Exam ও Question Bank মুছতে
              পারেন।
            </p>
          </div>
        </section>

        <div>
          <Link href="/" className="text-sm font-semibold text-navy hover:underline">
            ← হোম পেজে ফিরে যান
          </Link>
        </div>
      </main>
    </div>
  );
}
