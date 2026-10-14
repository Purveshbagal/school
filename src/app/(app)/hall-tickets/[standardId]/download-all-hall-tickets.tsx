"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { HallTicketCard, type HallTicketData } from "@/components/hall-ticket-card";
import { isMobileBrowser } from "@/components/print-download-actions";
import { getHallTicketsForDownloadAction } from "@/app/actions/hall-tickets";
import { Download, Loader2 } from "lucide-react";

/** Downloads every generated hall ticket of a standard for one exam as a single PDF,
 * one A5-landscape page per student. The tickets are rendered off-screen just long
 * enough to capture each one, then removed. */
export function DownloadAllHallTickets({
  standardId,
  examId,
  count,
  fileName,
}: {
  standardId: string;
  examId: string;
  count: number;
  fileName: string;
}) {
  const [tickets, setTickets] = useState<HallTicketData[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    // Opened synchronously inside the click so mobile Safari still treats it as a user
    // gesture (see PrintDownloadActions).
    const mobileTab = isMobileBrowser() ? window.open("", "_blank") : null;
    setProgress("Loading...");
    try {
      const data = await getHallTicketsForDownloadAction(standardId, examId);
      if (data.length === 0) {
        mobileTab?.close();
        return;
      }

      flushSync(() => setTickets(data));
      const container = containerRef.current;
      if (!container) {
        mobileTab?.close();
        return;
      }
      // Photos are data URLs, but still need decoding before html2canvas can paint them.
      await Promise.all(
        Array.from(container.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined))
      );

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-hall-ticket]"));
      for (let i = 0; i < cards.length; i++) {
        setProgress(`Preparing ${i + 1}/${cards.length}...`);
        const canvas = await html2canvas(cards[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
        if (i > 0) pdf.addPage();
        // JPEG keeps a class-sized PDF small; PNG pages would be several MB each.
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, pageHeight);
      }

      if (mobileTab) {
        mobileTab.location.href = pdf.output("bloburl").toString();
      } else {
        pdf.save(`${fileName}.pdf`);
      }
    } catch (error) {
      mobileTab?.close();
      console.error(error);
      window.alert("Could not prepare the hall tickets PDF. Please try again.");
    } finally {
      setTickets([]);
      setProgress(null);
    }
  }

  return (
    <>
      <Button onClick={handleDownload} disabled={count === 0 || progress !== null}>
        {progress ? <Loader2 className="animate-spin" /> : <Download />}
        {progress ?? `Download All (${count})`}
      </Button>

      {tickets.length > 0 && (
        <div
          ref={containerRef}
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] flex flex-col gap-4"
        >
          {tickets.map((ticket) => (
            <HallTicketCard key={ticket.id} data={ticket} />
          ))}
        </div>
      )}
    </>
  );
}
