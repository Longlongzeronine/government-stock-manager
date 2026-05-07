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
function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}
