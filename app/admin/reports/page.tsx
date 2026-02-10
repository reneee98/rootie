import Link from "next/link";
import { Shield, Flag } from "lucide-react";
import { getModeratorReports } from "@/lib/data/reports";
import { ReportActions } from "@/components/admin/report-actions";
import { formatDateTime } from "@/lib/formatters";

export default async function AdminReportsPage() {
  const reports = await getModeratorReports();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">Nahlásenia</h1>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Žiadne otvorené nahlásenia.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-lg border bg-card overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {report.context_preview.subtitle ?? report.target_type}
                    </span>
                    <div className="mt-0.5 flex items-center gap-2">
                      {report.context_preview.href ? (
                        <Link
                          href={report.context_preview.href}
                          className="font-medium text-sm text-primary underline truncate"
                        >
                          {report.context_preview.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-sm truncate">
                          {report.context_preview.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      report.status === "open"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {report.status === "open" ? "Otvorené" : "Preberá sa"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flag className="size-3 shrink-0" aria-hidden />
                  <span>Dôvod: {report.reason}</span>
                </div>

                {report.details && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {report.details}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Nahlásil: {report.reporter_name ?? report.reporter_id.slice(0, 8)}</span>
                  <span>{formatDateTime(report.created_at)}</span>
                  {report.subject_user_name && (
                    <span>Subjekt: {report.subject_user_name}</span>
                  )}
                </div>

                {report.moderator_notes && (
                  <p className="text-[11px] text-muted-foreground border-t pt-2 mt-2">
                    Poznámka: {report.moderator_notes}
                  </p>
                )}
              </div>

              <div className="border-t bg-muted/30 px-3 py-2">
                <ReportActions
                  reportId={report.id}
                  targetType={report.target_type}
                  subjectUserId={report.subject_user_id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
