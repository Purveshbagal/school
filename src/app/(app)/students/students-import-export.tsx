"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importStudentsAction, type ImportStudentsResult } from "@/app/actions/students-import";
import { FileUp, FileDown, Download } from "lucide-react";

type Standard = { id: string; name: string };

export function StudentsImportExport({
  standards,
  exportQuery,
}: {
  standards: Standard[];
  exportQuery: { q?: string; standard?: string; village?: string; status?: string; board?: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ImportStudentsResult | undefined, FormData>(
    importStudentsAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(exportQuery)) {
    if (value) exportParams.set(key, value);
  }
  const exportHref = `/api/students/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <>
      <Button variant="outline" render={<a href={exportHref} />}>
        <FileDown /> Export Excel
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) formRef.current?.reset();
        }}
      >
        <DialogTrigger render={<Button variant="outline" />}>
          <FileUp /> Import Excel
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload an .xlsx file with columns matching the template. Existing students are
              matched and updated by Register Number; new register numbers are added.
            </DialogDescription>
          </DialogHeader>

          <a
            href="/api/students/import-template"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Download className="size-3.5" /> Download import template
          </a>

          {standards.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Valid Standard values: {standards.map((s) => s.name).join(", ")}
            </p>
          )}

          <form ref={formRef} action={formAction} className="space-y-3">
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv"
              required
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
            />

            {state?.error && (
              <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {state.error}
              </div>
            )}

            {state && !state.error && (
              <div className="space-y-1.5 rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm">
                <p>
                  <span className="font-medium text-success">{state.created ?? 0} added</span>
                  {", "}
                  <span className="font-medium text-primary">{state.updated ?? 0} updated</span>
                  {state.errors && state.errors.length > 0 && (
                    <>
                      {", "}
                      <span className="font-medium text-destructive">
                        {state.errors.length} skipped
                      </span>
                    </>
                  )}
                </p>
                {state.errors && state.errors.length > 0 && (
                  <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                    {state.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={pending}>
                {pending ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
