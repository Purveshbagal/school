import { statSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { deleteNoticeAction } from "@/app/actions/notices";
import { formatDate } from "@/lib/utils";
import { Download, Megaphone, Smartphone } from "lucide-react";
import { NoticeForm } from "./notice-form";

const APK_PUBLIC_PATH = "/downloads/student-app.apk";

function apkInfo(): { url: string; updatedOn: string } | null {
  try {
    const stat = statSync(path.join(process.cwd(), "public", APK_PUBLIC_PATH));
    return { url: `${APK_PUBLIC_PATH}?v=${stat.mtimeMs.toFixed(0)}`, updatedOn: formatDate(stat.mtime) };
  } catch {
    return null;
  }
}

export default async function NoticesPage() {
  const [notices, standards] = await Promise.all([
    prisma.notice.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.standard.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  const standardName = new Map(standards.map((s) => [s.id, s.name]));
  const apk = apkInfo();

  return (
    <div>
      <PageHeader title="Notice Board" description="Notices sent here show up in the student app" />

      <Card size="sm" className="mb-5">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-semibold">Student app</p>
              <p className="text-muted-foreground">
                Students log in with the Aadhar number from their admission form. They see their profile, live school bus,
                exam timetable, results, fees and these notices.
              </p>
              {apk ? (
                <a href={apk.url} download className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <Download className="h-3.5 w-3.5" /> Download student app APK
                  <span className="text-xs font-normal text-muted-foreground">(updated {apk.updatedOn})</span>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Build the APK from the student_app folder.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sent Notices</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Megaphone className="h-8 w-8 text-muted-foreground/40" />
                <p>No notices yet. Write one using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{n.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {formatDate(n.createdAt)}
                          {n.createdBy && <span>· {n.createdBy}</span>}
                          {n.standardIds.length === 0 ? (
                            <Badge variant="info">All students</Badge>
                          ) : (
                            n.standardIds.map((id) => (
                              <Badge key={id} variant="outline">
                                {standardName.get(id) ?? "Removed standard"}
                              </Badge>
                            ))
                          )}
                        </p>
                      </div>
                      <DeleteButton
                        action={deleteNoticeAction}
                        hiddenFields={{ id: n.id }}
                        confirmMessage={`Delete notice "${n.title}"? It will disappear from the student app.`}
                      />
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-line text-foreground/90">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <NoticeForm standards={standards} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
