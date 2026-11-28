export default function ExamDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 sm:h-16 border-b border-slate-200 bg-white" />
      <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6 px-3 py-5 sm:px-4 sm:py-8 animate-pulse motion-reduce:animate-none">
        <div className="h-10 w-56 rounded-xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-2xl bg-slate-200" />
          <div className="h-20 rounded-2xl bg-slate-200" />
          <div className="h-20 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
