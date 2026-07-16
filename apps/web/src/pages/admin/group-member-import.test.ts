import { describe, expect, it } from "vitest";
import { parseGroupMemberRowsFromSheetRows } from "./group-member-import";

describe("group member Excel import", () => {
  it("maps Chinese Excel headers to userid import rows", () => {
    const rows = parseGroupMemberRowsFromSheetRows([
      ["中文名称", "部门", "userId"],
      ["张三", "研发部", "userid_001"],
      ["李四", "", "userid_002"]
    ]);

    expect(rows).toEqual([
      { name: "张三", department: "研发部", userid: "userid_001" },
      { name: "李四", userid: "userid_002" }
    ]);
  });

  it("skips empty rows and trims cell text", () => {
    const rows = parseGroupMemberRowsFromSheetRows([
      ["姓名", "企业微信userid", "部门"],
      ["  张三  ", "  userid_001  ", "  研发部  "],
      ["", "", ""]
    ]);

    expect(rows).toEqual([{ name: "张三", userid: "userid_001", department: "研发部" }]);
  });
});
