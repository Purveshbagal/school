import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

export function MarksSummaryTable({
  rows,
  totalObtained,
  totalMax,
  percentage,
}: {
  rows: { subjectName: string; marksObtained: number; totalMarks: number }[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead className="text-right">Marks Obtained</TableHead>
          <TableHead className="text-right">Total Marks</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.subjectName}>
            <TableCell className="font-medium">{r.subjectName}</TableCell>
            <TableCell className="text-right">{formatNumber(r.marksObtained)}</TableCell>
            <TableCell className="text-right">{formatNumber(r.totalMarks)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/40 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{formatNumber(totalObtained)}</TableCell>
          <TableCell className="text-right">{formatNumber(totalMax)}</TableCell>
        </TableRow>
        <TableRow className="bg-muted/40 font-semibold">
          <TableCell>Percentage</TableCell>
          <TableCell className="text-right" colSpan={2}>
            {percentage.toFixed(2)}%
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
