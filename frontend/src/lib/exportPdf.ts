import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportPageToPDF(title: string = "Report", subtitle: string = "", headers?: string[], data?: any[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 13);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (subtitle) {
    doc.text(subtitle, 14, 18);
  }
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 13, { align: "right" });
  
  if (headers && data && data.length > 0) {
    const tableData = data.map((row: any) => {
      if (Array.isArray(row)) {
        return row.map((val: any) => {
          if (val === "-" || val === null || val === undefined || val === "") return "-";
          if (typeof val === "number") return formatCompact(val);
          return String(val).substring(0, 40);
        });
      }
      return headers.map((h: string) => {
        const val = row[h];
        if (val === "-" || val === null || val === undefined || val === "") return "-";
        if (typeof val === "number") return formatCompact(val);
        return String(val).substring(0, 40);
      });
    });
    
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 28,
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [240, 255, 240],
      },
      margin: { left: 14, right: 14 },
    } as any);
  }
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
  
  const filename = title.toLowerCase().replace(/\s+/g, '-');
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Professional PDF export with table data
export function exportAsPDF(
  title: string,
  subtitle: string,
  headers: string[],
  data: any[],
  filename: string = "export"
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(78, 115, 223);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 16);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 14, 22);
  
  // Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 16, { align: "right" });
  
  // Table
  const tableData = data.map((row: any) => {
    if (Array.isArray(row)) {
      return row.map((val: any) => {
        if (val === "-" || val === null || val === undefined || val === "") return "-";
        if (typeof val === "number") return formatCompact(val);
        return String(val).substring(0, 30);
      });
    }
    return headers.map((h: string) => {
      const val = row[h];
      if (val === "-" || val === null || val === undefined || val === "") return "-";
      if (typeof val === "number") return formatCompact(val);
      return String(val).substring(0, 30);
    });
  });
  
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 32,
    headStyles: {
      fillColor: [78, 115, 223],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 'auto' },
    },
  } as any);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      "Krishvedi Farms Analysis",
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  doc.save(`${filename}.pdf`);
}

function formatCompact(num: number): string {
  if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + " L";
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(2) + " K";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatNumber(num: number): string {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (num >= 100000) return (num / 100000).toFixed(2) + " L";
  if (num >= 1000) return (num / 1000).toFixed(2) + " K";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function exportToPDF(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string = "export"
) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell: function(data: any) {
      if (typeof data.cell.raw === 'number') {
        data.cell.text[0] = formatNumber(data.cell.raw);
      }
    },
  });
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
      align: "center"
    });
  }
  
  doc.save(`${filename}.pdf`);
}

export function exportTableToPDF(
  title: string,
  headers: string[],
  data: any[],
  filename: string = "export"
) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  const tableData = data.map((row: any, idx: number) => {
    if (Array.isArray(row)) {
      return row.map((val: any) => {
        if (val === "-" || val === null || val === undefined || val === "") return "-";
        if (typeof val === "number") return formatNumber(val);
        return val;
      });
    }
    return headers.map((header: string) => {
      const val = row[header];
      if (val === "-" || val === null || val === undefined || val === "") return "-";
      if (typeof val === "number") return formatNumber(val);
      return val;
    });
  });
  
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
      align: "center"
    });
  }
  
  doc.save(`${filename}.pdf`);
}