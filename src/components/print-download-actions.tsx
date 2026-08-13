"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

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
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    const element = document.getElementById(targetId);
    if (!element) return;

    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
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

  return (
    <div className="flex justify-end gap-2 print:hidden">
      <Button variant="outline" onClick={handleDownload} disabled={downloading}>
        {downloading ? <Loader2 className="animate-spin" /> : <Download />}
        {downloading ? "Preparing..." : "Download PDF"}
      </Button>
      <Button onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}
