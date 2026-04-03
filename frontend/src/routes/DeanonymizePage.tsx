import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ShieldCheck,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  FileText,
  Upload,
} from "lucide-react";
import { PageHeader, Card, EmptyState } from "../components/Layout";
import { useSession } from "../context/SessionContext";
import apiClient from "../api/client";

export default function DeanonymizePage() {
  const { sessionId } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // AI response
  const [deanonymized, setDeanonymized] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  const [meta, setMeta] = useState<{
    model_used: string;
    prompt_used: string;
    anonymization_meta: Record<string, unknown>;
  } | null>(null);

  // Prompt templates
  const [prompts, setPrompts] = useState<
    { name: string; title: string }[]
  >([]);
  const [selectedPrompt, setSelectedPrompt] = useState("insights");

  // Load available prompts
  useEffect(() => {
    apiClient
      .get("/insights/prompts")
      .then(({ data }) => {
        setPrompts(data.prompts || []);
        if (data.prompts?.length > 0) {
          setSelectedPrompt(data.prompts[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setDeanonymized("");
    setRawResponse("");
    setMeta(null);

    try {
      const { data } = await apiClient.post(
        "/insights/generate",
        { prompt: selectedPrompt },
        { params: { session_id: sessionId }, timeout: 120000 }
      );
      setDeanonymized(data.deanonymized);
      setRawResponse(data.raw_response);
      setMeta({
        model_used: data.model_used,
        prompt_used: data.prompt_used,
        anonymization_meta: data.anonymization_meta,
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        "Failed to generate insights. Check that ANTHROPIC_API_KEY is set in backend/.env";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = showRaw ? rawResponse : deanonymized;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sessionId) {
    return (
      <div>
        <PageHeader
          title="AI Insights"
          description="Get AI-powered analysis of your RMC plant data"
        />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your Purchase, Sales, and Consumption Excel files first to generate insights."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Insights"
        description="Anonymized data is sent to Claude AI — response is de-anonymized with your real data"
      />

      {/* How it works + controls */}
      <Card className="mb-6">
        <div className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            {/* Pipeline visualization */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Pipeline
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">
                  <FileText size={12} /> Your Data
                </span>
                <span className="text-text-tertiary">→</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success-dark font-medium">
                  <ShieldCheck size={12} /> Anonymize
                </span>
                <span className="text-text-tertiary">→</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-info/10 text-info-dark font-medium">
                  <Sparkles size={12} /> Claude AI
                </span>
                <span className="text-text-tertiary">→</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning-dark font-medium">
                  <ShieldCheck size={12} /> De-anonymize
                </span>
                <span className="text-text-tertiary">→</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">
                  Real Insights
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-end gap-3">
              {prompts.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Prompt Template
                  </label>
                  <select
                    value={selectedPrompt}
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {prompts.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-base ${
                  loading
                    ? "bg-primary/60 text-white cursor-wait"
                    : "bg-primary text-white hover:bg-primary-dark"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Insights
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 mb-6 animate-fade-in-up">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="mb-6">
          <div className="p-12 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <h3 className="text-base font-semibold text-text-primary mb-1">
              Generating AI Insights
            </h3>
            <p className="text-sm text-text-secondary max-w-md">
              Your data is being anonymized and sent to Claude for analysis.
              This may take 30-60 seconds...
            </p>
          </div>
        </Card>
      )}

      {/* Results */}
      {deanonymized && !loading && (
        <Card className="animate-fade-in-up">
          {/* Header bar */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-text-primary">
                AI Analysis
              </h3>
              {meta && (
                <span className="badge-info inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium">
                  {meta.model_used}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-border hover:bg-white transition-base"
                title={
                  showRaw
                    ? "Show de-anonymized (real names)"
                    : "Show raw anonymized response"
                }
              >
                {showRaw ? (
                  <>
                    <EyeOff size={12} /> Anonymized
                  </>
                ) : (
                  <>
                    <Eye size={12} /> Real Names
                  </>
                )}
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-border hover:bg-white transition-base"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-success" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Markdown content */}
          <div className="p-6 lg:p-8 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {showRaw ? rawResponse : deanonymized}
            </ReactMarkdown>
          </div>

          {/* Anonymization stats footer */}
          {meta?.anonymization_meta && (
            <div className="px-5 py-3 border-t border-border bg-gray-50/50 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                Privacy
              </span>
              <span className="badge-success inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium">
                <ShieldCheck size={10} className="mr-1" />
                {(meta.anonymization_meta as any).customers_mapped +
                  (meta.anonymization_meta as any).suppliers_mapped}{" "}
                names anonymized
              </span>
              <span className="badge-info inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium">
                Values scaled ×
                {(meta.anonymization_meta as any).scale_factor?.toFixed(2)}
              </span>
              <span className="badge-warning inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium">
                Dates shifted{" "}
                {(meta.anonymization_meta as any).date_shift_days} days
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
