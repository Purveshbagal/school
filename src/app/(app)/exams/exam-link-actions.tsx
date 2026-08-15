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
    await navigator.clipboard.writeText(resultUrl);
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
