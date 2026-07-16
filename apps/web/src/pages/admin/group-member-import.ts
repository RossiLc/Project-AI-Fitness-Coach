import type { ImportGroupMemberByUseridRow } from "@openfit/shared";

type SheetCell = string | number | boolean | null | undefined;

const nameHeaders = new Set(["姓名", "中文名称", "名称", "name", "displayname"]);
const useridHeaders = new Set(["userid", "userId", "用户id", "用户ID", "企业微信userid", "企业微信userId", "企业微信用户id"]);
const departmentHeaders = new Set(["部门", "department", "部门名称"]);

export async function parseGroupMembersFromWorkbook(buffer: ArrayBuffer): Promise<ImportGroupMemberByUseridRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<SheetCell[]>(firstSheet, { header: 1, defval: "" });
  return parseGroupMemberRowsFromSheetRows(rows);
}

export function parseGroupMemberRowsFromSheetRows(rows: SheetCell[][]): ImportGroupMemberByUseridRow[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const columns = mapColumns(headerRow);
  if (columns.userid < 0 || columns.name < 0) return [];

  return dataRows
    .map((row) => ({
      name: cellText(row[columns.name]),
      userid: cellText(row[columns.userid]),
      department: columns.department >= 0 ? cellText(row[columns.department]) : ""
    }))
    .filter((row) => row.name || row.userid || row.department)
    .map((row) => ({
      name: row.name,
      userid: row.userid,
      ...(row.department ? { department: row.department } : {})
    }));
}

function mapColumns(headerRow: SheetCell[]) {
  const normalized = headerRow.map((cell) => normalizeHeader(cellText(cell)));
  return {
    name: normalized.findIndex((item) => nameHeaders.has(item)),
    userid: normalized.findIndex((item) => useridHeaders.has(item)),
    department: normalized.findIndex((item) => departmentHeaders.has(item))
  };
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "");
}

function cellText(value: SheetCell) {
  return String(value ?? "").trim();
}
