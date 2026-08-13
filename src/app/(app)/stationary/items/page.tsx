import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency } from "@/lib/utils";
import { deleteItemAction } from "@/app/actions/stationary";
import { ItemSearch } from "./item-search";
import { Plus, Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function StationaryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.StationaryItemWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};

  const items = await prisma.stationaryItem.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Stationary Item"
        description={`${items.length} item${items.length === 1 ? "" : "s"}`}
        actions={
          <Button render={<Link href="/stationary/items/new" />}>
            <Plus /> Add Item
          </Button>
        }
      />

      <Card>
        <CardContent>
          <ItemSearch initialQuery={q || ""} />

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q ? "No matching items found." : 'No items added yet. Click "Add Item" to create one.'}
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-2.5 md:hidden">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={item.status === "ACTIVE" ? "success" : "outline"}>{item.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/stationary/items/${item.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deleteItemAction}
                        hiddenFields={{ id: item.id }}
                        confirmMessage={`Delete "${item.name}"? This cannot be undone.`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "ACTIVE" ? "success" : "outline"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/stationary/items/${item.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deleteItemAction}
                            hiddenFields={{ id: item.id }}
                            confirmMessage={`Delete "${item.name}"? This cannot be undone.`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
