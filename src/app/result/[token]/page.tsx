import { prisma } from "@/lib/db";
import { DocumentHeader } from "@/components/document-header";
import { AadharLookupForm } from "./aadhar-lookup-form";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [exam, settings] = await Promise.all([
    prisma.exam.findUnique({ where: { resultToken: token } }),
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
  ]);
  const linkAvailable = Boolean(exam && exam.resultLinkActive);
  const schoolName = settings?.name || "School";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-3 py-6 sm:px-4 sm:py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {!linkAvailable ? (
            <>
              <DocumentHeader
                docType="Exam Result"
                schoolName={schoolName}
                address={settings?.address}
                udise={settings?.udise}
                phone={settings?.phone}
              />
              <p className="mt-6 rounded-lg bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                This result link is no longer available.
              </p>
            </>
          ) : (
            <AadharLookupForm
              token={token}
              schoolName={schoolName}
              address={settings?.address || null}
              udise={settings?.udise || null}
              phone={settings?.phone || null}
              examName={exam?.name || ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
