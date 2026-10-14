import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toHallTicketData } from "@/lib/hall-tickets";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { MobileScaleWrapper } from "@/components/mobile-scale-wrapper";
import { HallTicketCard } from "@/components/hall-ticket-card";

export default async function HallTicketViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();

  const [ticket, settings] = await Promise.all([
    prisma.hallTicket.findUnique({
      where: { id },
      include: { exam: true, student: true, standard: true },
    }),
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
  ]);
  if (!ticket) notFound();

  const data = toHallTicketData(ticket, settings);
  const backParams = new URLSearchParams({ year: ticket.academicYear, exam: ticket.examId });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 w-[210mm] max-w-full px-4 print:hidden">
        <PrintDownloadActions
          targetId="print-content"
          fileName={`Hall-Ticket-${ticket.seatNo}-${ticket.student.name.replace(/\s+/g, "-")}`}
          pdfFormat="a5"
          pdfOrientation="landscape"
          backHref={`/hall-tickets/${ticket.standardId}?${backParams.toString()}`}
        />
      </div>

      {/* overflow-hidden: the unscaled 794px ticket would otherwise widen the mobile layout
          viewport, and MobileScaleWrapper would then not detect a mobile width and never scale. */}
      <div className="overflow-hidden px-4 print:overflow-visible print:px-0">
        <MobileScaleWrapper desktopWidth={794}>
          <HallTicketCard
            id="print-content"
            data={data}
            className="print-a5-landscape shadow-lg ring-1 ring-slate-200 print:shadow-none print:ring-0"
          />
        </MobileScaleWrapper>
      </div>
    </div>
  );
}
