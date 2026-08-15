import * as XLSX from "xlsx";
import {
  STUDENT_IMPORT_COLUMNS,
  STUDENT_TEMPLATE_SAMPLE_ROW,
} from "@/lib/students-excel";

export async function GET() {
  const headers = STUDENT_IMPORT_COLUMNS.map((c) => c.header);
  const worksheet = XLSX.utils.json_to_sheet([STUDENT_TEMPLATE_SAMPLE_ROW], { header: headers });
  worksheet["!cols"] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="students-import-template.xlsx"`,
    },
  });
}
