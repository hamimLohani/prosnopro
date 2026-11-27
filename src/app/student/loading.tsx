export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-slate-200 bg-white" />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
