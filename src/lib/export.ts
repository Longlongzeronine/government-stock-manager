import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
 * Export the APP-CSE 2026 form as a properly formatted XLSX matching the official template.
 * Groups items by category with section headers, quarterly columns, and summary totals.
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
  const grandTotal = part1Total + part2Total;

  // ── Column definitions (27 columns: A to AA) ──
  // 0=#, 1=Code, 2=Item&Specs, 3=Unit, 4-23=monthly(20), 24=TotalQty, 25=UnitPrice, 26=TotalAmt
  const COL_COUNT = 27;
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  const data: any[][] = [];
  const merges: XLSX.Range[] = [];

  // ── Row 0: Title ──
  data.push(["APP-CSE 2026 FORM"]);
  merges.push(merge(0, 0, 0, COL_COUNT - 1));

  // ── Row 1: Subtitle ──
  data.push(["ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM"]);
  merges.push(merge(1, 0, 1, COL_COUNT - 1));

  // ── Row 2: Note ──
  data.push(["Note: APP-CSE for FY 2026 must be submitted on or before 31 August 2025."]);
  merges.push(merge(2, 0, 2, COL_COUNT - 1));

  // ── Rows 3-4: Agency info ──
  const agencyRows = [
    [
      'Department/Bureau/Office: ' + (fields.department || ''),
      '', '', '',
      'Agency Code/UACS: ' + (fields.agencyCode || ''),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ],
    [
      'Region: ' + (fields.region || ''),
      '', '', '',
      'Organization Type: ' + (fields.organizationType || ''),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ],
    [
      'Address: ' + (fields.address || ''),
      '', '', '', '',
      'Contact Person: ' + (fields.contact || ''),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ],
    [
      'E-mail: ' + (fields.email || ''),
      '', '', '', '',
      'Telephone/Mobile Nos: ' + (fields.telephone || ''),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ],
  ];
  data.push(...agencyRows);

  // ── Row 8: Empty spacer ──
  data.push([]);

  // ── Row 9: Main header (merged row 1) ──
  const headerRow1 = Array(COL_COUNT).fill("");
  headerRow1[0] = "Item & Specifications";
  merges.push(merge(data.length, 0, data.length, 2)); // merged A-C
  headerRow1[3] = "Unit of Measure";
  headerRow1[4] = "Monthly Quantity Requirement";
  merges.push(merge(data.length, 4, data.length, 23)); // merged E-X
  headerRow1[24] = "Total Quantity for the year";
  headerRow1[25] = "Unit Price as of May 14, 2025";
  headerRow1[26] = "Total Amount for the year";
  data.push(headerRow1);

  // ── Row 10: Sub-header row ──
  const subHeaders = [
    "#", "Code", "Item & Specifications", "Unit",
    "Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT",
    "April", "May", "June", "Q2", "Q2\nAMOUNT",
    "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT",
    "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT",
    "Total\nQty", "Unit\nPrice", "Total\nAmount"
  ];
  data.push(subHeaders);

  let rowIdx = data.length; // track where data rows start

  // ── Render item groups ──
  const renderSection = (groups: Record<string, any[]>, partLabel: string, withCode: boolean) => {
    // Part header row
    data.push([partLabel]);
    merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 1));
    rowIdx++;

    for (const [catName, catItems] of Object.entries(groups)) {
      // Category header row
      data.push([catName]);
      merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 1));
      rowIdx++;

      catItems.forEach((item, idx) => {
        const months = monthsFor(item);
        const price = Number(item.acquisition_cost || 0);
        const totalQty = months.reduce((s, v) => s + v, 0);
        const code = withCode ? (item.barcode_value || item.qr_code_value || "") : "";
        const name = item.name || "";
        const unit = item.unit || "";
        const monthlyVals = monthlyCols(months, price);
        const totalAmt = FMT(totalQty * price);

        const row = [
          idx + 1,               // #
          code,                  // Code
          name,                  // Item & Specifications
          unit,                  // Unit
          ...monthlyVals,       // 20 monthly/quarter cols
          totalQty,              // Total Quantity
          price,                 // Unit Price
          totalAmt,              // Total Amount
        ];
        data.push(row);
        rowIdx++;
      });
    }
  };

  // Part I (with barcode codes)
  renderSection(planGroups, "PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", true);

  // Part II (without barcode codes)
  renderSection(itemGroups, "PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES", false);

  // ── Grand Total row ──
  const grandTotalRow = Array(COL_COUNT).fill("");
  grandTotalRow[0] = "TOTAL APP-CSE REQUIREMENT (Part I + Part II)";
  merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 2));
  grandTotalRow[COL_COUNT - 1] = FMT(grandTotal);
  data.push(grandTotalRow);
  rowIdx++;

  // ── Summary section ──
  const addSummary = (title: string, total: number, inflation: number, grand: number) => {
    data.push([title]);
    merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 1));
    rowIdx++;

    const summaryRows = [
      ["A. TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `₱ ${FMT(total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
      ["B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `₱ ${FMT(inflation).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
      ["C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "₱ 0.00"],
      ["D. GRAND TOTAL (A + B + C)", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `₱ ${FMT(grand).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
      ["E. APPROVED BUDGET BY THE AGENCY HEAD / In Figures and Words:"],
    ];
    data.push(...summaryRows);
    rowIdx += summaryRows.length;
  };

  data.push([]);
  rowIdx++;

  addSummary("PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)", part1Total, part1Inflation, part1GrandTotal);

  data.push([]); rowIdx++;
  data.push(["Consistent with DBM Circular Letter No. 2011-6, agencies shall include regular non-PS-DBM requirements in their APP-CSE."]);
  merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 1));
  rowIdx++;

  addSummary("PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES", part2Total, part2Inflation, part2GrandTotal);

  // ── Certification section ──
  data.push([]); rowIdx++;
  data.push(["We hereby warrant that total amount reflected in this Annual Procurement Plan has been included in or is within approved budget for the year."]);
  merges.push(merge(rowIdx, 0, rowIdx, COL_COUNT - 1));
  rowIdx++;

  const certRows = [
    ["Prepared by:", "", "", "", "", "", "", "", "", "", "Certified Funds Available:", "", "", "", "", "", "", "", "", "", "Approved by:"],
    [fields.preparedBy || "_________________________", "", "", "", "", "", "", "", "", "", fields.certifiedBy || "_________________________", "", "", "", "", "", "", "", "", "", fields.approvedBy || "_________________________"],
    ["Property/Supply Officer", "", "", "", "", "", "", "", "", "", "Accountant / Budget Officer", "", "", "", "", "", "", "", "", "", "Head of Office/Agency"],
    ["Date: " + (fields.preparedDate || dateStr), "", "", "", "", "", "", "", "", "", "Date: " + (fields.accountantDate || dateStr), "", "", "", "", "", "", "", "", "", "Date: " + (fields.approvedDate || dateStr)]
  ];
  data.push(...certRows);

  // ── Write workbook ──
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 22 },  // Code
    { wch: 50 },  // Item & Specifications
    { wch: 14 },  // Unit
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 11 },  // Q1
    { wch: 7 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 11 },  // Q2
    { wch: 7 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 11 },  // Q3
    { wch: 7 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 11 },  // Q4
    { wch: 10 }, // Total Qty
    { wch: 14 }, // Unit Price
    { wch: 16 }, // Total Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "APP-CSE 2026");
  // Rename the downloaded file to include the date, e.g. APP-CSE-2026-FORM-8-2-2026.xlsx
  const outName = filename || `APP-CSE-2026-FORM-${dateStr}`;
  XLSX.writeFile(wb, `${outName}.xlsx`);
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
