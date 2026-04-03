import { useState } from "react";
import { X, Maximize2, Download } from "lucide-react";

interface ExpandableCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function ExpandableCard({ title, children, className = "" }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className={`relative group ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm border border-border/50 hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
          title="Expand"
        >
          <Maximize2 size={16} className="text-text-secondary" />
        </button>
        {children}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50">
              <h2 className="text-xl font-bold text-text-primary">{title}</h2>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  <Download size={18} className="text-text-secondary" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ExpandableSection({ title, children }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="relative group mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm border border-border/50 hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
          title="Expand"
        >
          <Maximize2 size={16} className="text-text-secondary" />
        </button>
        {children}
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50">
              <h2 className="text-xl font-bold text-text-primary">{title}</h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}