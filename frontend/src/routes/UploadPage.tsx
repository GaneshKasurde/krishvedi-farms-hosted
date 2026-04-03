import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Loader2,
} from "lucide-react";
import FileUpload from "../components/FileUpload";
import { useSession } from "../context/SessionContext";
import { formatMonthLabel } from "../components/MonthSelector";
import apiClient from "../api/client";

export default function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, monthsLoaded, setSessionId, addMonth, isLoading: sessionLoading } = useSession();

  const [dataFile, setDataFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = dataFile !== null;

  if (sessionLoading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-start justify-center pt-8">
        <div className="flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="ml-3 text-text-secondary">Loading session...</span>
        </div>
      </div>
    );
  }

  const handleUpload = useCallback(async () => {
    if (!canUpload) return;

    const formData = new FormData();
    formData.append("data_file", dataFile);
    formData.append("month", "auto");
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    setWarnings([]);
    setUploadSuccess(false);
    setError(null);
    setIsUploading(true);

    try {
      const response = await apiClient.post("/upload-krishvedi", formData);
      console.log("Upload response:", response);
      const data = response.data;

      setSessionId(data.session_id);
      const months = data.months ?? [data.month];
      months.forEach((m: string) => addMonth(m));
      setWarnings(data.validation_warnings || []);
      setUploadSuccess(true);

      setDataFile(null);
      setIsUploading(false);

      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 1500);
    } catch (err: any) {
      console.error("Upload error full:", err);
      console.error("Upload error response:", err.response);
      console.error("Upload error message:", err.message);
      console.error("Upload error status:", err.response?.status);
      const errorMsg = err.response?.data?.detail || err.message || err.toString() || "Upload failed. Please try again.";
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  }, [canUpload, dataFile, sessionId, navigate, setSessionId, addMonth]);

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-start justify-center pt-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Upload size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Upload Krishvedi Data
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Upload your single Excel file with all transaction data
          </p>
        </div>

        {/* Loaded months */}
        {monthsLoaded.length > 0 && (
          <div className="bg-card-bg rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-sm font-semibold text-text-primary">
                Loaded Months
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {monthsLoaded.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  <CheckCircle2 size={12} className="mr-1" />
                  {formatMonthLabel(m)}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Upload additional months below to enable trend analysis
            </p>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-card-bg rounded-lg shadow-sm border border-border">
          <div className="p-6">
            {/* Single File Upload */}
            <div className="mb-6">
              <FileUpload
                label="Data File"
                description="Drop your Excel file here or click to browse"
                file={dataFile}
                onFileSelect={setDataFile}
              />
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-warning-dark" />
                  <span className="text-sm font-semibold text-warning-dark">
                    Validation Warnings
                  </span>
                </div>
                <ul className="space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-warning-dark">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-sm font-medium text-success-dark">
                    Data uploaded successfully! Redirecting to dashboard...
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-danger" />
                  <span className="text-sm font-medium text-danger">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!canUpload || isUploading}
              className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                canUpload && !isUploading
                  ? "bg-primary text-white hover:bg-primary-dark"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
