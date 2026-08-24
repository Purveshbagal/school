"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, Image as ImageIcon, Loader2 } from "lucide-react";

export function PrintDownloadActions({
  targetId,
  fileName,
  pdfFormat = "a4",
  pdfOrientation = "portrait",
  backHref,
}: {
  targetId: string;
  fileName: string;
  pdfFormat?: "a4" | "a5";
  pdfOrientation?: "portrait" | "landscape";
  /** Where Back should go when this page was opened directly (new tab, refresh, shared
   * link) and there's no browser history to go back to — router.back() is a silent no-op
   * in that case. */
  backHref?: string;
}) {
  const router = useRouter();

  function handleBack() {
    // A same-origin referrer means this page was reached by an in-app navigation, so
    // there's a real history entry for router.back() to land on. Without one — the page
    // was opened directly (new tab, bookmark, refresh, shared link) — history.length can
    // still be >1 (browsers count the tab's initial blank entry), so router.back() silently
    // lands on about:blank instead of doing anything visible.
    let sameOriginReferrer = false;
    try {
      sameOriginReferrer = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameOriginReferrer = false;
    }

    if (backHref && !sameOriginReferrer) {
      router.push(backHref);
    } else {
      router.back();
    }
  }
  const [downloading, setDownloading] = useState(false);
  const [downloadingJpg, setDownloadingJpg] = useState(false);

  async function captureCanvas() {
    const element = document.getElementById(targetId);
    if (!element) return null;

    const { default: html2canvas } = await import("html2canvas-pro");
    return html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
  }

  // Mobile browsers (iOS Safari in particular) largely ignore the anchor `download`
  // attribute and silently drop `pdf.save()`/programmatic link clicks once they happen
  // after an async gap (canvas capture, dynamic imports) — the click is no longer treated
  // as a direct user gesture. The reliable fallback there is opening the generated file
  // in a new tab as a blob URL, which lets the user view it and use the browser's own
  // "Save to Files" / share sheet.
  function isMobileBrowser() {
    if (typeof navigator === "undefined") return false;
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true;
    // iPadOS 13+ Safari reports a desktop "Macintosh" UA by default; touch support
    // is the only reliable signal distinguishing it from an actual Mac.
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  async function handleDownload() {
    setDownloading(true);
    // Open the tab synchronously, inside the click handler, so mobile Safari still counts
    // it as a direct user gesture — setting its location later (once the PDF is ready) is
    // fine, but calling window.open() itself after an await gets silently blocked.
    const mobileTab = isMobileBrowser() ? window.open("", "_blank") : null;
    try {
      const [canvas, { jsPDF }] = await Promise.all([captureCanvas(), import("jspdf")]);
      if (!canvas) {
        mobileTab?.close();
        return;
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: pdfOrientation, unit: "mm", format: pdfFormat });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      if (mobileTab) {
        mobileTab.location.href = pdf.output("bloburl").toString();
      } else {
        pdf.save(`${fileName}.pdf`);
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadJpg() {
    setDownloadingJpg(true);
    const mobileTab = isMobileBrowser() ? window.open("", "_blank") : null;
    try {
      const canvas = await captureCanvas();
      if (!canvas) {
        mobileTab?.close();
        return;
      }

      if (mobileTab) {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              mobileTab.close();
              return;
            }
            mobileTab.location.href = URL.createObjectURL(blob);
          },
          "image/jpeg",
          0.95
        );
      } else {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.download = `${fileName}.jpg`;
        link.click();
      }
    } finally {
      setDownloadingJpg(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft /> Back
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={handleDownloadJpg} disabled={downloadingJpg}>
          {downloadingJpg ? <Loader2 className="animate-spin" /> : <ImageIcon />}
          {downloadingJpg ? "Preparing..." : "Download JPG"}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          {downloading ? "Preparing..." : "Download PDF"}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
    </div>
  );
}
