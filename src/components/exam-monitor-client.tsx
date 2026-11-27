"use client";

import { AlertTriangle, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AttemptDetail, EntryEvent } from "@/lib/types";

interface ExamMonitorClientProps {
  attempts: AttemptDetail[];
  events: EntryEvent[];
}

export function ExamMonitorClient({ attempts, events }: ExamMonitorClientProps) {
  const router = useRouter();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      router.refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [autoRefresh, router]);

  function handleManualRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  }

  const eventsByStudent = new Map<string, EntryEvent[]>();
  for (const ev of events) {
    const list = eventsByStudent.get(ev.student_id) ?? [];
    list.push(ev);
    eventsByStudent.set(ev.student_id, list);
  }

  const nameByStudentId = new Map<string, { name: string; roll: string | null }>();
  for (const a of attempts) {
    nameByStudentId.set(a.student_id, { name: a.student_name, roll: a.student_roll });
  }

  const inProgressCount = attempts.filter((a) => a.status === "in_progress").length;
  const submittedCount = attempts.length - inProgressCount;
  const secondDeviceEvents = events.filter((e) => e.event_type === "second_device");
  const newTabEvents = events.filter((e) => e.event_type === "new_tab");

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
            <Users className="h-4 w-4" />
            Active: {inProgressCount}
          </span>
          <span className="text-slate-600">Submitted: {submittedCount}</span>
          {secondDeviceEvents.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              <ShieldAlert className="h-3.5 w-3.5" />
              {secondDeviceEvents.length} second-device alert(s)
            </span>
          )}
          {newTabEvents.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {newTabEvents.length} extra-tab alert(s)
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-2.5 sm:border-t-0 sm:pt-0">
          <label className="inline-flex min-h-[38px] items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-5 w-5 sm:h-4 sm:w-4 rounded border-slate-300 text-navy"
            />
            <span>Auto-refresh (15s)</span>
          </label>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Students Table / Mobile Cards */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-navy">Entered Students ({attempts.length})</h2>

        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">No students have started this exam yet.</p>
        ) : (
          <>
            {/* Mobile Monitor Cards */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {attempts.map((a) => {
                const sEvents = eventsByStudent.get(a.student_id) ?? [];
                const hasSecondDevice = sEvents.some((e) => e.event_type === "second_device");
                const hasNewTab = sEvents.some((e) => e.event_type === "new_tab");
                const resumeCount = sEvents.filter((e) => e.event_type === "resumed").length;
                const v = a.violation_counts ?? {
                  tab_switches: 0,
                  blurs: 0,
                  copy_attempts: 0,
                  away_seconds: 0,
                };

                return (
                  <div key={a.id} className="py-3.5 space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{a.student_name}</p>
                        <p className="text-xs text-slate-500">
                          {a.student_roll ? `Roll: ${a.student_roll}` : "No Roll"} • Joined{" "}
                          {new Date(a.started_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          a.status === "in_progress"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>
                        {v.tab_switches ?? 0} switches • {v.away_seconds ?? 0}s away
                        {(v.copy_attempts ?? 0) > 0 && ` • ${v.copy_attempts} copy`}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {hasSecondDevice && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                            Second device
                          </span>
                        )}
                        {hasNewTab && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                            New tab
                          </span>
                        )}
                        {resumeCount > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            Resumed ({resumeCount})
                          </span>
                        )}
                        {!hasSecondDevice && !hasNewTab && resumeCount === 0 && (
                          <span className="text-emerald-700 font-medium">Clean</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Roll / ID</th>
                    <th className="py-2 pr-4">Joined At</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Switches / Away</th>
                    <th className="py-2 pr-4">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((a) => {
                    const sEvents = eventsByStudent.get(a.student_id) ?? [];
                    const hasSecondDevice = sEvents.some((e) => e.event_type === "second_device");
                    const hasNewTab = sEvents.some((e) => e.event_type === "new_tab");
                    const resumeCount = sEvents.filter((e) => e.event_type === "resumed").length;
                    const v = a.violation_counts ?? {
                      tab_switches: 0,
                      blurs: 0,
                      copy_attempts: 0,
                      away_seconds: 0,
                    };

                    return (
                      <tr key={a.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">{a.student_name}</td>
                        <td className="py-3 pr-4 text-slate-600">{a.student_roll ?? "—"}</td>
                        <td className="py-3 pr-4 text-xs text-slate-600">
                          {new Date(a.started_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              a.status === "in_progress"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600">
                          {v.tab_switches ?? 0} switches • {v.away_seconds ?? 0}s away
                          {(v.copy_attempts ?? 0) > 0 && ` • ${v.copy_attempts} copy`}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            {hasSecondDevice && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                                Second device
                              </span>
                            )}
                            {hasNewTab && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                New tab
                              </span>
                            )}
                            {resumeCount > 0 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                Resumed ({resumeCount})
                              </span>
                            )}
                            {!hasSecondDevice && !hasNewTab && resumeCount === 0 && (
                              <span className="text-xs text-slate-400">Clean</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Note: Mobile notifications, incoming calls, or screen locks can trigger isolated blur or
            tab-switch counts. Look for repeated switches, long away times, or second-device alerts.
          </span>
        </p>
      </section>

      {/* Entry Event Timeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
        <h2 className="text-base font-bold text-navy">Entry &amp; Re-entry Timeline</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No entry events logged yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {events.map((ev) => {
              const info = nameByStudentId.get(ev.student_id);
              return (
                <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-semibold uppercase ${
                        ev.event_type === "second_device"
                          ? "bg-rose-100 text-rose-800"
                          : ev.event_type === "new_tab"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ev.event_type.replace("_", " ")}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {info?.name ?? ev.student_id.slice(0, 8)}
                    </span>
                    {info?.roll && <span className="text-slate-500">({info.roll})</span>}
                  </div>
                  <div className="text-slate-500">
                    {ev.ip ?? "—"} • {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
