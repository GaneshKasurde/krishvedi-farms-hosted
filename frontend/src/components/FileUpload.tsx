import { useCallback, useState, useRef, type DragEvent } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react";

interface FileUploadProps {
  label: string;
  description: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

export default function FileUpload({
  label,
  description,
  file,
  onFileSelect,
  accept = ".xlsx,.xls",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      onFileSelect(selected);
    },
    [onFileSelect]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFileSelect(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileSelect]
  );

  return (
    <div className="flex-1">
      <label className="block text-sm font-semibold text-text-primary mb-2">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "dropzone-active border-primary bg-primary/5"
            : file
            ? "border-success/50 bg-success/5"
            : "border-border hover:border-primary/40 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle size={20} className="text-success" />
            <div className="text-left">
              <p className="text-sm font-medium text-text-primary">
                {file.name}
              </p>
              <p className="text-xs text-text-secondary">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="ml-2 p-1 rounded hover:bg-gray-200 transition-colors"
            >
              <X size={16} className="text-text-secondary" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-2">
              {isDragging ? (
                <FileSpreadsheet size={32} className="text-primary" />
              ) : (
                <Upload size={32} className="text-text-secondary/60" />
              )}
            </div>
            <p className="text-sm text-text-secondary">{description}</p>
            <p className="text-xs text-text-secondary/60 mt-1">
              .xlsx or .xls files
            </p>
          </>
        )}
      </div>
    </div>
  );
}
