import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { appCseCode } from "@/lib/utils";

// ── Official APP-CSE 2026 form texts (shared by the XLSX and PDF exports) ──
const APP_CSE_INTRO =
  "This form contains the common-use supplies and equipment (CSE) being carried by the Procurement Service – Department of Budget and Management (PS-DBM) that shall be purchased by government agencies. \n" +
  "Consistent with the DBM Circular Letter Nos. 2011-6 and 2011-6-A dated 25 August 2011 and 28 September 2011, respectively, the APP-CSE shall serve as the agency’s annual procurement request for all its CSE requirements.\n" +
  "Only agencies with uploaded APP-CSE in the Modernized Philippine Government Electronic Procurement System (mPhilGEPS) will be able to purchase CSE from the PS-DBM.\n" +
  "Note that the items listed on this form have been arranged in accordance with the United Nations Standard Products and Services Code (UNSPSC).";

const APP_CSE_REMINDERS = [
  "The APP-CSE form must be accomplished using Microsoft Excel format. The APP-CSE shall be deemed incorrect or invalid if the form used is other than the prescribed format which is downloadable from the mPhilGEPS and Downloads page of PS-DBM website (www.ps-philgeps.gov.ph).",
  "All information must be provided accurately.",
  "Kindly refer to the CSE catalogue on the PS-DBM website (www.ps-philgeps.gov.ph) under the \"What We Sell\" tab for the detailed technical specifications and sample photo of the items.",
  "Do not delete, add, or revise any items or rows on this form, otherwise the form will be deemed invalid.",
  "For items not included on the list of PART II, a separate form with the file name APP-CSE 2026 Form - Other Items, can be fill-out through this link: https://forms.gle/ygzEaiJRnWqmdkkF6",
  "Once signed and approved by the Property/Supply Officer, Accountant/Budget Officer, and Head of the Agency/Office, kindly upload the soft copy of the APP-CSE in Microsoft Excel format as well as the original signed copy in Portable Document Format (PDF) to the agency’s mPhilGEPS account on or before the prescribed period or deadline. Any APP-CSE form that is unsigned or has incomplete signature shall be deemed invalid.",
  "Should there be changes in the agency’s CSE requirements, the agency may edit their uploaded APP-CSE directly on their mPhilGEPS account. However, the agency must ensure that a signed and approved copy of the supplemental APP-CSE form is available. Note that all CSE requirements in excess of the quantities indicated in the original APP-CSE form will not be served if not covered by a supplemental APP-CSE.",
  "Please be advised that modifications to product codes may be implemented without prior notification. Should such changes occur, it will be necessary for agencies with CSE requirements to edit and submit a Supplemental APP-CSE on their mPhilGEPS account.",
  "For further assistance or clarification, agencies may contact the Marketing and Sales Division of PS-DBM through its mobile numbers 0918-2954426 (Smart) or 0962-8255199 (Smart), or email appcse.helpdesk@ps-philgeps.gov.ph, or visit the PS-DBM website (www.ps-philgeps.gov.ph) for the guide on how to fill-out the APP-CSE.",
];

export function exportCSV(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  download(csv, `${filename}.csv`, "text/csv");
}
export function exportXLSX(rows: any[], filename: string, sheet = "Data") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
export function exportPDF(title: string, columns: string[], rows: any[][], filename: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14); doc.text(title, 14, 14);
  doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
  autoTable(doc, { head: [columns], body: rows, startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [34, 51, 102] } });
  doc.save(`${filename}.pdf`);
}

/**
 * Export the APP-CSE 2026 form as an XLSX that mirrors the official
 * APP_CSE_Template_2026.xlsx layout: title, introduction, reminders, note,
 * agency fields, the 27-column item table (Part I + Part II), the A–E summary
 * sections, and the certification/signature block.
 */
export function exportAppCseXlsx(
  allItems: any[],
  monthlyPlan: Record<string, number[]>,
  fields: Record<string, string>,
  filename?: string
) {
  // ── Helpers ──
  const FMT = (v: number) => Number(v.toFixed(2));
  // Date like 8-2-2026 (month-day-year, no leading zeros)
  const dateStr = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  })();
  const monthsFor = (item: any): number[] =>
    monthlyPlan[item.id] ||
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      .map((m, i) => Number(item[`${m}_quantity`] ?? (i === 0 ? item.quantity : 0)) || 0);

  const monthlyCols = (months: number[], price: number): (string | number)[] => {
    return [0, 3, 6, 9].flatMap((start) => {
      const q = months.slice(start, start + 3).reduce((s, v) => s + v, 0);
      return [...months.slice(start, start + 3), q, FMT(q * price)];
    });
  };

  // Split into Part I (has barcode) and Part II (no barcode)
  const part1Items = allItems.filter((i: any) => i.barcode_value);
  const part2Items = allItems.filter((i: any) => !i.barcode_value);

  const planGroups = part1Items.reduce<Record<string, any[]>>((g, i: any) => {
    const cat = i.category?.name || "PS-DBM SUPPLIES";
    (g[cat] ||= []).push(i);
    return g;
  }, {});

  const itemGroups = part2Items.reduce<Record<string, any[]>>((g, i: any) => {
    const cat = i.category?.name || (i.item_type === "material" ? "MATERIALS" : "SUPPLIES");
    (g[cat] ||= []).push(i);
    return g;
  }, {});

  const totalAmount = (items: any[]) =>
    items.reduce((s, i) => s + monthsFor(i).reduce((a, q) => a + q, 0) * Number(i.acquisition_cost || 0), 0);

  const part1Total = totalAmount(part1Items);
  const part2Total = totalAmount(part2Items);
  const part1Inflation = part1Total * 0.1;
  const part1GrandTotal = part1Total + part1Inflation;
  const part2Inflation = part2Total * 0.1;
  const part2GrandTotal = part2Total + part2Inflation;

  // ── Column definitions (27 columns: A to AA) ──
  // 0=#, 1=Code, 2=Item&Specs, 3=Unit, 4-23=monthly(20), 24=TotalQty, 25=UnitPrice, 26=TotalAmt
  const COL_COUNT = 27;
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  const data: any[][] = [];
  const merges: XLSX.Range[] = [];
  const push = (row: any[]): number => {
    data.push(row);
    return data.length - 1;
  };

  // ── Style palette (mirrors APP_CSE_Template_2026.xlsx) ──
  const thin = { style: "thin", color: { rgb: "000000" } } as const;
  const box = { top: thin, bottom: thin, left: thin, right: thin };
  const FILL = (rgb: string) => ({ patternType: "solid", fgColor: { rgb }, bgColor: { rgb } });
  const FONT = (sz: number, bold = false) => ({ name: "Tahoma", sz, bold, color: { rgb: "000000" } });
  const PALETTE: Record<string, any> = {
    title: { font: FONT(13, true), alignment: { horizontal: "center", vertical: "center" } },
    subtitle: { font: FONT(12, true), alignment: { horizontal: "center", vertical: "center" } },
    section: { font: FONT(12, true) },
    body: { font: FONT(10), alignment: { vertical: "top", wrapText: true } },
    agencyLabel: { font: FONT(11) },
    agencyValue: { fill: FILL("F2F2F2"), font: FONT(11) },
    header: {
      fill: FILL("F4B083"),
      font: FONT(13, true),
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: box,
    },
    subMonth: {
      fill: FILL("F7CAAC"),
      font: FONT(11, true),
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: box,
    },
    subAmount: {
      fill: FILL("F4B083"),
      font: FONT(11, true),
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: box,
    },
    part: { fill: FILL("FFE598"), font: FONT(11, true), border: box },
    category: { fill: FILL("8EAADB"), font: FONT(11), border: box },
    item: {
      fill: FILL("FFFFFF"),
      font: FONT(11),
      alignment: { vertical: "center", wrapText: true },
      border: box,
    },
    itemMoney: {
      fill: FILL("FFFFFF"),
      font: FONT(10),
      alignment: { vertical: "center", horizontal: "right" },
      border: box,
      numFmt: "#,##0.00",
    },
    summaryTitle: { fill: FILL("FFE598"), font: FONT(12, true), border: box },
    summaryLabel: { font: FONT(11, true), border: box },
    summaryValue: { font: FONT(11), alignment: { horizontal: "right" }, border: box, numFmt: "#,##0.00" },
    grand: { fill: FILL("8EAADB"), font: FONT(12, true), border: box },
    certLabel: { font: FONT(11) },
    certName: { fill: FILL("F3F3F3"), font: FONT(11) },
    certTitle: { font: FONT(10, true) },
  };
  // marks[k] holds the row indices pushed for each structural part
  const marks: Record<string, number[]> = { part: [], category: [], item: [], summaryTitle: [], summaryNote: [], sumLabel: [], grand: [], certLabel: [], certName: [], certTitle: [] };
  const heights: Record<number, number> = {};
  const markRow = (key: string, r: number) => { (marks[key] ||= []).push(r); };

  // ── Title block ──
  push(["APP-CSE 2026 FORM"]);
  merges.push(merge(0, 0, 0, COL_COUNT - 1));
  push(["ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM"]);
  merges.push(merge(1, 0, 1, COL_COUNT - 1));
  push([]);

  // ── Introduction ──
  push(["Introduction:"]);
  merges.push(merge(3, 0, 3, 21));
  push([APP_CSE_INTRO]);
  merges.push(merge(4, 0, 4, COL_COUNT - 1));
  push([]);
  push([]);
  push([]);

  // ── Reminders ──
  push(["Reminders:"]);
  merges.push(merge(8, 0, 8, 21));
  APP_CSE_REMINDERS.forEach((text, i) => {
    const r = push([String(i + 1), text]);
    merges.push(merge(r, 1, r, COL_COUNT - 1));
  });
  push([]);
  push([]);
  push([]);

  // ── Note ──
  const noteRow = push(["Note: The APP-CSE for FY 2026 must be submitted on or before 31 August 2025."]);
  merges.push(merge(noteRow, 0, noteRow, 21));

  // ── Agency fields (mirrors template column layout) ──
  const agencyRows: any[][] = [];
  const ar = (c2: string, c3: string, c8: string, c9: string, c15: string, c18: string) => {
    const row: any[] = [];
    if (c2) row[2] = c2;
    if (c3) row[3] = c3;
    if (c8) row[8] = c8;
    if (c9) row[9] = c9;
    if (c15) row[15] = c15;
    if (c18) row[18] = c18;
    agencyRows.push(row);
  };
  ar("Department/Bureau/Office:", fields.department || "", "Agency Code/UACS:", "", "Contact Person:", fields.contact || "");
  ar("Region:", fields.region || "", "Organization Type:", fields.organizationType || "", "Position:", fields.position || "");
  ar("Address:", fields.address || "", "", "", "E-mail : ", fields.email || "");
  ar("", "", "", "", "Telephone/Mobile Nos: ", fields.telephone || "");
  agencyRows.forEach((row) => {
    const r = push(row);
    if (row[3]) merges.push(merge(r, 3, r, 5));
    if (row[9]) merges.push(merge(r, 9, r, 11));
    if (row[18]) merges.push(merge(r, 18, r, 20));
  });
  push([]);
  push([]);
  push([]);

  // ── Main table header (2 rows, mirrored merges) ──
  const hdrR = push(Array(COL_COUNT).fill(""));
  data[hdrR][0] = "Item & Specifications";
  data[hdrR][3] = "Unit of Measure";
  data[hdrR][4] = "Monthly Quantity Requirement";
  data[hdrR][24] = "Total Quantity\r\nfor the year";
  data[hdrR][25] = "Unit Price as of May 14, 2025";
  data[hdrR][26] = "Total Amount\r\nfor the year";
  merges.push(merge(hdrR, 0, hdrR + 1, 2)); // Item & Specifications (A:C)
  merges.push(merge(hdrR, 3, hdrR + 1, 3)); // Unit of Measure (D)
  merges.push(merge(hdrR, 4, hdrR, 23)); // Monthly Quantity Requirement (E:X)
  merges.push(merge(hdrR, 24, hdrR + 1, 24)); // Total Quantity (Y)
  merges.push(merge(hdrR, 25, hdrR + 1, 25)); // Unit Price (Z)
  merges.push(merge(hdrR, 26, hdrR + 1, 26)); // Total Amount (AA)

  // Sub-header: month columns at E(4)..X(23)
  const subHdr = Array(COL_COUNT).fill("");
  const monthSubs = [
    "Jan", "Feb", "Mar", "Q1", "Q1\r\nAMOUNT",
    "April ", "May ", "June", "Q2", "Q2\r\nAMOUNT",
    "July", "Aug", "Sept", "Q3", "Q3\r\nAMOUNT",
    "Oct", "Nov", "Dec", "Q4", "Q4\r\nAMOUNT",
  ];
  monthSubs.forEach((h, i) => { subHdr[4 + i] = h; });
  push(subHdr);

  // ── Item sections ──
  const renderPart = (label: string, groups: Record<string, any[]>) => {
    const partRow = push([label]);
    merges.push(merge(partRow, 0, partRow, COL_COUNT - 1));
    markRow("part", partRow);
    heights[partRow] = 36;
    let n = 0;
    for (const [catName, catItems] of Object.entries(groups)) {
      const catRow = push([catName]);
      merges.push(merge(catRow, 0, catRow, COL_COUNT - 1));
      markRow("category", catRow);
      heights[catRow] = 30.75;
      (catItems as any[]).forEach((item) => {
        const months = monthsFor(item);
        const price = Number(item.acquisition_cost || 0);
        const totalQty = months.reduce((s, v) => s + v, 0);
        const code = appCseCode(item);
        n += 1;
        const itemRow = data.length;
        data.push([
          n, code, item.name || "", item.unit || "",
          ...monthlyCols(months, price),
          totalQty, price, FMT(totalQty * price),
        ]);
        markRow("item", itemRow);
        heights[itemRow] = 30.75;
      });
    }
  };

  renderPart("PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", planGroups);
  renderPart(
    "PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES (Note: Please indicate price of items)",
    itemGroups
  );

  // ── Summary sections (A–E, values in column 24 as in the template) ──
  const addSummary = (title: string, note: string | undefined, total: number, inflation: number, grand: number, titleHeight = 37.5) => {
    const titleRow = push([title]);
    merges.push(merge(titleRow, 0, titleRow, COL_COUNT - 1));
    markRow("summaryTitle", titleRow);
    heights[titleRow] = titleHeight;
    if (note) {
      const noteRow2 = push([note]);
      merges.push(merge(noteRow2, 0, noteRow2, 17));
      markRow("summaryNote", noteRow2);
      heights[noteRow2] = 39;
    }
    const sumRows: [string, number][] = [
      ["A. TOTAL ", total],
      ["B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL)", inflation],
      ["C.  ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable)", 0],
      ["D. GRAND TOTAL (A + B+ C)", grand],
    ];
    sumRows.forEach(([label, val], idx) => {
      const r = push(Array(COL_COUNT).fill(""));
      data[r][0] = label;
      merges.push(merge(r, 0, r, 2));
      data[r][24] = FMT(val);
      merges.push(merge(r, 24, r, 26));
      if (idx === 3) {
        markRow("grand", r);
        heights[r] = 30.75;
      } else {
        markRow("sumLabel", r);
        heights[r] = 42;
      }
    });
    const eRow = push(Array(COL_COUNT).fill(""));
    data[eRow][0] = "E. APPROVED BUDGET BY THE AGENCY HEAD\r\nIn Figures and Words:";
    merges.push(merge(eRow, 0, eRow, 2));
    merges.push(merge(eRow, 3, eRow, COL_COUNT - 1));
    markRow("grand", eRow);
    heights[eRow] = 30.75;
  };

  push([]);
  addSummary("PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", undefined, part1Total, part1Inflation, part1GrandTotal);
  push([]);
  addSummary(
    "PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES",
    "Consistent with Section 4.4 of Circular Letter No. 2011-6 and 2011-6, all agencies and concerned units are enjoined to include in the APP-CSE all supplies, commodities or materials and equipment which are consumed and needed in their day-to-day operations. This shall be one of the bases for the PS-DBM in expanding the Electronic Catalogue to include other products commonly purchased by government entities.",
    part2Total,
    part2Inflation,
    part2GrandTotal,
    29.25 // Part II summary title height per template row 385
  );

  // ── Certification / signature block ──
  push([]);
  const warrantRow = push([
    "We hereby warrant that the total amount reflected in this Annual Procurement Plan to procure the listed common-use supplies, materials, and equipment has been included in or is within our approved budget for the year. ",
  ]);
  merges.push(merge(warrantRow, 0, warrantRow, 21));
  heights[warrantRow] = 25.5;
  const blank1 = push([]);
  heights[blank1] = 15.75;

  const labelsRow = push([]);
  data[labelsRow][1] = "Prepared by:";
  data[labelsRow][7] = "Certified Funds Available / Certified Appropriate Funds Available:";
  data[labelsRow][20] = "Approved by:";
  markRow("certLabel", labelsRow);
  heights[labelsRow] = 24;

  const namesRow = push([]);
  data[namesRow][1] = fields.preparedBy || "_________________________";
  data[namesRow][7] = fields.certifiedBy || "_________________________";
  data[namesRow][20] = fields.approvedBy || "_________________________";
  merges.push(merge(namesRow, 1, namesRow + 2, 2));
  merges.push(merge(namesRow, 7, namesRow + 2, 16));
  merges.push(merge(namesRow, 20, namesRow + 2, COL_COUNT - 1));
  markRow("certName", namesRow);
  heights[namesRow] = 24;

  const blank2 = push([]);
  heights[blank2] = 21.75;
  const blank3 = push([]);
  heights[blank3] = 18;
  const titlesRow = push([]);
  data[titlesRow][1] = "Property/Supply Officer";
  data[titlesRow][8] = "Accountant / Budget Officer";
  data[titlesRow][20] = "Head of Office/Agency";
  merges.push(merge(titlesRow, 1, titlesRow, 2));
  merges.push(merge(titlesRow, 8, titlesRow, 15));
  merges.push(merge(titlesRow, 20, titlesRow, COL_COUNT - 1));
  markRow("certTitle", titlesRow);
  heights[titlesRow] = 19.5;

  const blank4 = push([]);
  heights[blank4] = 21.75;
  const dateRow = push([]);
  data[dateRow][1] = "Date Prepared:";
  data[dateRow][2] = fields.preparedDate || dateStr;
  heights[dateRow] = 15.75;

  // ── Write workbook ──
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;

  // Apply a style to a run of cells in a row (creating cells so borders render in empty regions)
  const styleRow = (r: number, st: any, from = 0, to = COL_COUNT - 1) => {
    for (let c = from; c <= to; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: "s", v: "" };
      ws[addr].s = st;
    }
  };
  const center = (st: any) => ({ ...st, alignment: { ...(st.alignment || {}), horizontal: "center" } });
  const right = (st: any) => ({ ...st, alignment: { ...(st.alignment || {}), horizontal: "right" } });

  // ── Fixed top rows (title, intro, reminders, note, agency) ──
  styleRow(0, PALETTE.title);
  styleRow(1, PALETTE.subtitle);
  styleRow(3, PALETTE.section);
  styleRow(4, PALETTE.body);
  styleRow(8, PALETTE.section);
  for (let r = 9; r <= 17; r++) styleRow(r, PALETTE.body);
  styleRow(21, PALETTE.section);
  for (let r = 22; r <= 25; r++) {
    styleRow(r, PALETTE.agencyLabel, 0, 21);
    [3, 9, 18].forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = PALETTE.agencyValue;
    });
  }

  // ── Table header rows (29 = main, 30 = sub header) ──
  styleRow(29, PALETTE.header);
  // Sub-header: month cells F7CAAC, Q# AMOUNT cells F4B083
  styleRow(30, PALETTE.subMonth, 0, 3);
  for (let q = 0; q < 4; q++) {
    const base = 4 + q * 5;
    styleRow(30, PALETTE.subMonth, base, base + 3); // Jan,Feb,Mar,Q1
    styleRow(30, PALETTE.subAmount, base + 4, base + 4); // Q1 AMOUNT
  }
  styleRow(30, PALETTE.header, 24, 26);

  // ── Item sections ──
  marks.part.forEach((r) => styleRow(r, PALETTE.part));
  marks.category.forEach((r) => styleRow(r, PALETTE.category));
  marks.item.forEach((r) => {
    styleRow(r, PALETTE.item);
    styleRow(r, center(PALETTE.item), 0, 0);   // #
    styleRow(r, PALETTE.item, 1, 2);           // code + name (left)
    styleRow(r, center(PALETTE.item), 3, 3);   // unit
    styleRow(r, center(PALETTE.item), 4, 7);   // Jan..Q1
    styleRow(r, PALETTE.itemMoney, 8, 8);      // Q1 AMOUNT
    styleRow(r, center(PALETTE.item), 9, 12);  // April..Q2
    styleRow(r, PALETTE.itemMoney, 13, 13);
    styleRow(r, center(PALETTE.item), 14, 17); // July..Q3
    styleRow(r, PALETTE.itemMoney, 18, 18);
    styleRow(r, center(PALETTE.item), 19, 22); // Oct..Q4
    styleRow(r, PALETTE.itemMoney, 23, 23);
    styleRow(r, center(PALETTE.item), 24, 24); // Total Qty
    styleRow(r, PALETTE.itemMoney, 25, 26);    // Unit Price + Total Amount
  });

  // ── Summary sections ──
  marks.summaryTitle.forEach((r) => styleRow(r, PALETTE.summaryTitle));
  marks.summaryNote.forEach((r) => styleRow(r, PALETTE.body));
  marks.sumLabel.forEach((r) => {
    styleRow(r, PALETTE.summaryLabel, 0, 26); // full-width base so borders connect across the row
    styleRow(r, right(PALETTE.summaryValue), 24, 26); // value (merged Y:AA)
  });
  marks.grand.forEach((r) => styleRow(r, PALETTE.grand));

  // ── Certification / signature block ──
  marks.certLabel.forEach((r) => {
    [1, 7, 20].forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = PALETTE.certLabel;
    });
  });
  marks.certName.forEach((r) => {
    [1, 7, 20].forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = PALETTE.certName;
    });
  });
  marks.certTitle.forEach((r) => {
    [1, 8, 20].forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) ws[addr].s = PALETTE.certTitle;
    });
  });

  // ── Row heights (mirror the official template) ──
  const FIXED_HEIGHTS: Record<number, number> = {
    0: 15, 1: 18.75, 2: 15, 3: 15, 4: 72, 5: 15, 6: 15, 7: 15, 8: 15,
    9: 13.5, 10: 13.5, 11: 13.5, 12: 13.5, 13: 18.65, 14: 33, 15: 29.25, 16: 16.5, 17: 27,
    18: 10.5, 19: 10.5, 20: 10.5, 21: 15, 22: 15, 23: 15, 24: 15, 25: 15, 26: 15, 27: 15, 28: 15,
    29: 47.25, 30: 32.25,
  };
  Object.assign(heights, FIXED_HEIGHTS);
  const maxRow = data.length;
  ws["!rows"] = Array.from({ length: maxRow }, (_, r) => (heights[r] ? { hpt: heights[r] } : undefined)) as any;

  // ── Column widths (mirror the official template) ──
  ws["!cols"] = [
    { wch: 6.17 },  // #
    { wch: 23 },    // Code
    { wch: 72.5 },  // Item & Specifications
    { wch: 10.67 }, // Unit
    { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 18.83 },  // Q1
    { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 18.83 },  // Q2
    { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 18.83 },  // Q3
    { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 13.17 }, { wch: 18.83 },  // Q4
    { wch: 13.67 }, // Total Qty
    { wch: 13.67 }, // Unit Price
    { wch: 53.67 }, // Total Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "APP-CSE 2026 FORM");
  // Rename the downloaded file to include the date, e.g. APP-CSE-2026-FORM-8-2-2026.xlsx
  const outName = filename || `APP-CSE-2026-FORM-${dateStr}`;
  XLSX.writeFile(wb, `${outName}.xlsx`);
}

export function exportAppCsePdf(
  allItems: any[],
  monthlyPlan: Record<string, number[]>,
  fields: Record<string, string>,
  filename?: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const FMT = (v: number) => Number(v.toFixed(2));
  const dateStr = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  })();
  const monthsFor = (item: any): number[] =>
    monthlyPlan[item.id] ||
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      .map((m, i) => Number(item[`${m}_quantity`] ?? (i === 0 ? item.quantity : 0)) || 0);
  const money = (v: number) =>
    FMT(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Compact amount for the narrow monthly cells (no thousands grouping so it fits)
  const compact = (v: number) => FMT(v).toFixed(2);

  const monthlyCols = (months: number[], price: number): (string | number)[] =>
    [0, 3, 6, 9].flatMap((start) => {
      const q = months.slice(start, start + 3).reduce((s, v) => s + v, 0);
      return [...months.slice(start, start + 3), q, compact(q * price)];
    });

  // Part I / Part II grouping (mirror the XLSX export)
  const part1Items = allItems.filter((i: any) => i.barcode_value);
  const part2Items = allItems.filter((i: any) => !i.barcode_value);
  const planGroups = part1Items.reduce<Record<string, any[]>>((g, i: any) => {
    const cat = i.category?.name || "PS-DBM SUPPLIES";
    (g[cat] ||= []).push(i);
    return g;
  }, {});
  const itemGroups = part2Items.reduce<Record<string, any[]>>((g, i: any) => {
    const cat = i.category?.name || (i.item_type === "material" ? "MATERIALS" : "SUPPLIES");
    (g[cat] ||= []).push(i);
    return g;
  }, {});
  const totalAmount = (items: any[]) =>
    items.reduce((s, i) => s + monthsFor(i).reduce((a, q) => a + q, 0) * Number(i.acquisition_cost || 0), 0);
  const part1Total = totalAmount(part1Items);
  const part2Total = totalAmount(part2Items);
  const part1Inflation = part1Total * 0.1;
  const part1GrandTotal = part1Total + part1Inflation;
  const part2Inflation = part2Total * 0.1;
  const part2GrandTotal = part2Total + part2Inflation;

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("APP-CSE 2026 FORM", pageW / 2, 11, { align: "center" });
  doc.setFontSize(8);
  doc.text("ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM", pageW / 2, 16, { align: "center" });

  // ── Introduction (mirrors the XLSX export) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Introduction:", 9, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const introLines = doc.splitTextToSize(APP_CSE_INTRO, pageW - 18);
  doc.text(introLines, 9, 24);
  let y = 24 + introLines.length * 2.4 + 3;

  // ── Reminders 1–9 (mirrors the XLSX export) ──
  doc.setFont("helvetica", "bold");
  doc.text("Reminders:", 9, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  APP_CSE_REMINDERS.forEach((text, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${text}`, pageW - 18);
    doc.text(lines, 9, y);
    y += lines.length * 2.4 + 2;
    if (y > 195) {
      doc.addPage();
      y = 12;
    }
  });

  // ── Note (mirrors the XLSX export) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Note: The APP-CSE for FY 2026 must be submitted on or before 31 August 2025.", 9, y);
  y += 5;

  // ── Agency fields ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const agencyLines: [string, string, string][] = [
    [`Department/Bureau/Office: ${fields.department || ""}`, "Agency Code/UACS:", `Contact Person: ${fields.contact || ""}`],
    [`Region: ${fields.region || ""}`, `Organization Type: ${fields.organizationType || ""}`, `Position: ${fields.position || ""}`],
    [`Address: ${fields.address || ""}`, "", `E-mail : ${fields.email || ""}`],
    ["", "", `Telephone/Mobile Nos: ${fields.telephone || ""}`],
  ];
  agencyLines.forEach((row) => {
    row.forEach((text, i) => {
      if (text) doc.text(text, 9 + i * 95, y);
    });
    y += 4.5;
  });
  y += 2;

  // ── Column widths (27 columns, A4 landscape) — sums to 279mm to fit 9mm margins ──
  const widths = [6, 16, 40, 8, ...Array(20).fill(8.5), 9, 14, 16];
  const colStyles: Record<number, any> = {};
  widths.forEach((w, i) => {
    colStyles[i] = {
      cellWidth: w,
      halign: i === 0 || i === 3 || i === 24 ? "center" : i >= 25 ? "right" : "left",
      fontSize: i >= 4 && i <= 23 ? 5.4 : 6,
    };
  });

  const body: any[] = [];
  const renderPart = (label: string, groups: Record<string, any[]>) => {
    body.push([
      {
        content: label,
        colSpan: 27,
        styles: { fillColor: [232, 118, 44], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.5, halign: "left" },
      },
    ]);
    let n = 0;
    for (const [catName, catItems] of Object.entries(groups)) {
      body.push([
        {
          content: catName,
          colSpan: 27,
          styles: { fillColor: [220, 230, 245], textColor: [2, 24, 63], fontStyle: "bold", fontSize: 6, halign: "left" },
        },
      ]);
      (catItems as any[]).forEach((item) => {
        const months = monthsFor(item);
        const price = Number(item.acquisition_cost || 0);
        const totalQty = months.reduce((s, v) => s + v, 0);
        const code = appCseCode(item);
        n += 1;
        body.push([
          n,
          code,
          item.name || "",
          item.unit || "",
          ...monthlyCols(months, price),
          totalQty,
          money(price),
          money(totalQty * price),
        ]);
      });
    }
  };

  renderPart("PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", planGroups);
  renderPart(
    "PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES (Note: Please indicate price of items)",
    itemGroups
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 9, right: 9, top: 9, bottom: 9 },
    styles: { fontSize: 6, cellPadding: 0.8, textColor: [15, 23, 42], lineColor: [15, 23, 42], lineWidth: 0.12 },
    headStyles: { fillColor: [2, 24, 63], textColor: [255, 255, 255], fontSize: 5.8, halign: "center", valign: "middle" },
    columnStyles: colStyles,
    head: [
      [
        { content: "Item & Specifications", colSpan: 3, rowSpan: 2 },
        { content: "Unit of Measure", rowSpan: 2 },
        { content: "Monthly Quantity Requirement", colSpan: 20 },
        { content: "Total Quantity\nfor the year", rowSpan: 2 },
        { content: "Unit Price as of\nMay 14, 2025", rowSpan: 2 },
        { content: "Total Amount\nfor the year", rowSpan: 2 },
      ],
      ["Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT", "April", "May", "June", "Q2", "Q2\nAMOUNT", "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT", "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT"],
    ],
    body,
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  let sy = finalY + 6;
  if (sy > 190) {
    doc.addPage();
    sy = 12;
  }

  // ── Summary sections (A–E) ──
  const summary = (title: string, note: string | undefined, total: number, inflation: number, grand: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title, 9, sy);
    sy += 4.5;
    const rows: [string, number][] = [
      ["A. TOTAL", total],
      ["B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL)", inflation],
      ["C.  ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable)", 0],
      ["D. GRAND TOTAL (A + B+ C)", grand],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    rows.forEach(([label, val]) => {
      doc.text(label, 12, sy);
      doc.text(money(val), pageW - 9, sy, { align: "right" });
      sy += 4;
    });
    doc.setFont("helvetica", "bold");
    doc.text("E. APPROVED BUDGET BY THE AGENCY HEAD", 12, sy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text("In Figures and Words:", 95, sy);
    sy += 5.5;
    if (note) {
      const noteLines = doc.splitTextToSize(note, pageW - 18);
      doc.setFontSize(5.2);
      doc.text(noteLines, 12, sy);
      sy += noteLines.length * 2.2 + 3;
    }
    sy += 3;
  };

  summary("PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", undefined, part1Total, part1Inflation, part1GrandTotal);
  if (sy > 180) {
    doc.addPage();
    sy = 12;
  }
  summary(
    "PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES",
    "Consistent with Section 4.4 of Circular Letter No. 2011-6 and 2011-6, all agencies and concerned units are enjoined to include in the APP-CSE all supplies, commodities or materials and equipment which are consumed and needed in their day-to-day operations. This shall be one of the bases for the PS-DBM in expanding the Electronic Catalogue to include other products commonly purchased by government entities.",
    part2Total,
    part2Inflation,
    part2GrandTotal
  );

  // ── Certification / signature block ──
  if (sy > 175) {
    doc.addPage();
    sy = 12;
  }
  const warrant = doc.splitTextToSize(
    "We hereby warrant that the total amount reflected in this Annual Procurement Plan to procure the listed common-use supplies, materials, and equipment has been included in or is within our approved budget for the year.",
    pageW - 18
  );
  doc.setFontSize(6);
  doc.text(warrant, 9, sy);
  sy += warrant.length * 2.2 + 8;

  const sigX = [9, pageW * 0.42, pageW * 0.68];
  doc.setFontSize(6.5);
  doc.text("Prepared by:", sigX[0], sy);
  doc.text("Certified Funds Available / Certified Appropriate Funds Available:", sigX[1], sy);
  doc.text("Approved by:", sigX[2], sy);
  sy += 9;
  const lineW = pageW * 0.24;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.25);
  sigX.forEach((x) => doc.line(x, sy, x + lineW, sy));
  doc.setFontSize(6.5);
  doc.text(fields.preparedBy || "_________________________", sigX[0], sy - 1.2, { maxWidth: lineW });
  doc.text(fields.certifiedBy || "_________________________", sigX[1], sy - 1.2, { maxWidth: lineW });
  doc.text(fields.approvedBy || "_________________________", sigX[2], sy - 1.2, { maxWidth: lineW });
  sy += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Property/Supply Officer", sigX[0], sy);
  doc.text("Accountant / Budget Officer", sigX[1], sy);
  doc.text("Head of Office/Agency", sigX[2], sy);
  sy += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Date Prepared: ${fields.preparedDate || dateStr}`, 9, sy);

  const outName = filename || `APP-CSE-2026-FORM-${dateStr}`;
  doc.save(`${outName}.pdf`);
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
