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
}: {
  targetId: string;
  fileName: string;
  pdfFormat?: "a4" | "a5";
  pdfOrientation?: "portrait" | "landscape";
}) {
  const router = useRouter();
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

  async function handleDownload() {
    setDownloading(true);
    try {
      const [canvas, { jsPDF }] = await Promise.all([captureCanvas(), import("jspdf")]);
      if (!canvas) return;

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

      pdf.save(`${fileName}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadJpg() {
    setDownloadingJpg(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = `${fileName}.jpg`;
      link.click();
    } finally {
      setDownloadingJpg(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
      <Button variant="outline" onClick={() => router.back()}>
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
