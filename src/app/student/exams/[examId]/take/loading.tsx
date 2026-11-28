export default function TakeExamLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 sm:h-16 border-b border-slate-200 bg-white" />
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-6 animate-pulse motion-reduce:animate-none">
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-5">
            <div className="h-56 rounded-2xl bg-slate-200" />
            <div className="h-56 rounded-2xl bg-slate-200" />
          </div>
          <div className="hidden lg:block h-72 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
