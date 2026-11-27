export default function TeacherLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-slate-200 bg-white" />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-10 w-48 rounded-xl bg-slate-200" />
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
