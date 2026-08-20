import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { FeeStructureForm } from "./fee-structure-form";
import { updateStandardPromotionAction } from "@/app/actions/standards";

export default async function EditFeeStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [standard, otherStandards] = await Promise.all([
    prisma.standard.findUnique({ where: { id } }),
    prisma.standard.findMany({ where: { id: { not: id } }, orderBy: [{ order: "asc" }, { name: "asc" } ] }),
  ]);
  if (!standard) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const academicYear = settings?.academicYear || "2026-27";

  const feeStructure = await prisma.feeStructure.findUnique({
    where: { standardId_academicYear: { standardId: id, academicYear } },
    include: { components: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={`Fee Structure — Standard ${standard.name}`}
        description={`Academic year ${academicYear}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Promotion Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Controls what happens to this standard&apos;s active students on &quot;Switch
            Academic Year&quot; (Settings → Academic Year).
          </p>
          <form action={updateStandardPromotionAction} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-1.5">
              <Label htmlFor="board">Board</Label>
              <NativeSelect id="board" name="board" defaultValue={standard.board || ""}>
                <option value="">Not set</option>
                <option value="CBSE">CBSE</option>
                <option value="Maharashtra State Board">Maharashtra State Board</option>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                When set, a student&apos;s Board is updated to this on promotion into this standard.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promotesToId">Promotes To</Label>
              <NativeSelect id="promotesToId" name="promotesToId" defaultValue={standard.promotesToId || ""}>
                <option value="">Auto (next standard by order)</option>
                {otherStandards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Override which standard active students move into. Needed when tracks
                diverge, e.g. a CBSE-only track that rejoins the main track later.
              </p>
            </div>
            <Button type="submit">Save Promotion Settings</Button>
          </form>
        </CardContent>
      </Card>

      <FeeStructureForm
        standardId={id}
        academicYear={academicYear}
        initialComponents={
          feeStructure?.components.map((c) => ({ name: c.name, amount: c.amount })) || [
            { name: "Tuition Fee", amount: 0 },
          ]
        }
      />
    </div>
  );
}
