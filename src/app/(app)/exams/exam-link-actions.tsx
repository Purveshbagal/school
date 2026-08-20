"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Check, Square } from "lucide-react";
import { generateResultLinkAction, stopResultLinkAction } from "@/app/actions/exams";

export function ExamLinkActions({
  examId,
  resultToken,
  resultLinkActive,
  origin,
}: {
  examId: string;
  resultToken: string | null;
  resultLinkActive: boolean;
  /** Site origin computed server-side (from request headers) so the URL is correct on first render, with no client/server mismatch. */
  origin: string;
}) {
  const [copied, setCopied] = useState(false);

  const resultUrl = resultToken ? `${origin}/result/${resultToken}` : null;

  async function copyLink() {
    if (!resultUrl) return;

    // navigator.clipboard requires a secure context (HTTPS, or localhost) — on a live
    // site served over plain HTTP it's undefined, so fall back to the legacy
    // execCommand approach via a hidden textarea, which works everywhere.
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(resultUrl);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resultUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {resultLinkActive && resultToken ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy Link"}
            </Button>
            <form action={stopResultLinkAction}>
              <input type="hidden" name="id" value={examId} />
              <Button type="submit" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Square /> Stop
              </Button>
            </form>
          </>
        ) : (
          <form action={generateResultLinkAction}>
            <input type="hidden" name="id" value={examId} />
            <Button type="submit" variant="outline" size="sm">
              <Link2 /> Generate Link
            </Button>
          </form>
        )}
      </div>
      {resultLinkActive && resultUrl && (
        <p className="max-w-[220px] truncate text-xs text-muted-foreground" title={resultUrl}>
          {resultUrl}
        </p>
      )}
    </div>
  );
}
