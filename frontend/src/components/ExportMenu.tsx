import { useState, useRef, useEffect } from "react";
import { Download, FileText, Layers, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useSession } from "../context/SessionContext";

export default function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { sessionId } = useSession();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const exportCurrentPage = () => {
    setIsOpen(false);
    window.scrollTo(0, 0);
    setTimeout(() => window.print(), 100);
  };

  const exportAllPages = async () => {
    if (!sessionId) return;
    setIsOpen(false);
    setIsExporting(true);

    try {
      // Get main content elements
      const sidebar = document.querySelector('aside');
      const mainElement = document.querySelector('main');
      const contentDiv = mainElement?.querySelector('div');

      if (!contentDiv) {
        throw new Error("Content not found");
      }

      // Hide sidebar
      if (sidebar) (sidebar as HTMLElement).style.display = 'none';

      // Store original styles
      const origStyles = {
        width: contentDiv.style.width,
        maxWidth: contentDiv.style.maxWidth,
        padding: contentDiv.style.padding,
        overflow: mainElement ? (mainElement as HTMLElement).style.overflow : '',
      };

      // Expand to full height
      if (mainElement) (mainElement as HTMLElement).style.overflow = 'visible';
      contentDiv.style.width = '1400px';
      contentDiv.style.maxWidth = '1400px';
      contentDiv.style.padding = '20px';

      // Wait for everything to render
      await new Promise(r => setTimeout(r, 1200));
      window.scrollTo(0, 0);

      // Try html2canvas with error handling
      const html2canvas = (await import("html2canvas")).default;
      
      const canvas = await html2canvas(contentDiv as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove any problematic elements in cloned document
          const clonedSidebar = clonedDoc.querySelector('aside');
          if (clonedSidebar) clonedSidebar.remove();
        }
      });

      // Restore styles
      if (sidebar) (sidebar as HTMLElement).style.display = '';
      contentDiv.style.width = origStyles.width;
      contentDiv.style.maxWidth = origStyles.maxWidth;
      contentDiv.style.padding = origStyles.padding;
      if (mainElement) (mainElement as HTMLElement).style.overflow = origStyles.overflow;

      // Generate PDF
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxContentHeight = pageHeight - 20;
      const numPages = Math.ceil(imgHeight / maxContentHeight);

      // Title page
      pdf.setFillColor(34, 197, 94);
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text('Krishvedi Farms Analysis', margin, 12);
      
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(16);
      pdf.text('Full Report', margin, 32);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 42);
      pdf.text(`Session: ${sessionId.slice(0, 10)}...`, margin, 50);

      // Content pages
      for (let i = 0; i < numPages; i++) {
        pdf.addPage();
        
        pdf.setFillColor(34, 197, 94);
        pdf.rect(0, 0, pageWidth, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.text(`Krishvedi Farms - Page ${i + 1}`, margin, 8);
        
        const yOffset = (i * maxContentHeight * canvas.width) / canvas.height;
        const sliceHeight = Math.min(maxContentHeight * canvas.width, canvas.height - yOffset);
        
        pdf.addImage(
          canvas.toDataURL('image/png'), 
          'PNG', 
          margin, 
          15, 
          imgWidth, 
          (sliceHeight / canvas.width) * imgWidth
        );
      }

      pdf.save(`KrishvediFarms-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      setToast({ type: 'success', message: 'PDF exported successfully!' });
      
    } catch (err) {
      console.error("PDF export failed:", err);
      // Fallback to browser print
      window.scrollTo(0, 0);
      setTimeout(() => window.print(), 200);
      setToast({ type: 'info', message: 'Fell back to print dialog' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          className="w-full px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <button
              onClick={exportCurrentPage}
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 border-b border-gray-100"
            >
              <FileText size={16} className="text-blue-500" />
              Export Current Page (Print)
            </button>
            <button
              onClick={exportAllPages}
              disabled={isExporting || !sessionId}
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={16} className="animate-spin text-green-500" />
              ) : (
                <Layers size={16} className="text-green-500" />
              )}
              {isExporting ? 'Exporting...' : 'Export All Pages (PDF)'}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 
          toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'info' && <AlertTriangle size={18} />}
          {toast.type === 'error' && <XCircle size={18} />}
          {toast.message}
        </div>
      )}
    </>
  );
}