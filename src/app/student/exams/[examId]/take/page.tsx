import { redirect } from "next/navigation";
import { ExamRunnerClient } from "@/components/exam-runner-client";
import { getCurrentUserContext } from "@/lib/supabase/server";

interface TakeExamPageProps {
  params: Promise<{ examId: string }>;
}

export default async function TakeExamPage({ params }: TakeExamPageProps) {
  const ctx = await getCurrentUserContext();
  if (!ctx.configured || !ctx.userId) redirect("/login");
  if (!ctx.profile) redirect("/onboarding");
  if (ctx.profile.role !== "student") redirect("/teacher");

  const { examId } = await params;

  return <ExamRunnerClient examId={examId} />;
}
