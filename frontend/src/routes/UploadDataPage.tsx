import { useState } from "react";
import { FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, X, Upload, Database, Receipt } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useExpensesUpload } from "../api/queries";
import { PageHeader, Card } from "../components/Layout";
import { useNavigate } from "@tanstack/react-router";

export default function UploadDataPage() {
  const navigate = useNavigate();
  const { sessionId, setSessionId, addMonth } = useSession();
  const uploadMutation = useExpensesUpload();
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [consumptionFile, setConsumptionFile] = useState<File | null>(null);
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [indirectFile, setIndirectFile] = useState<File | null>(null);
  const [otherIncomeFile, setOtherIncomeFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!salesFile && !purchaseFile && !consumptionFile && !directFile && !indirectFile && !otherIncomeFile) {
      setUploadResult({ success: false, message: "Select at least one file to upload" });
      return;
    }

    const formData = new FormData();
    if (salesFile) formData.append("sales_file", salesFile);
    if (purchaseFile) formData.append("purchase_file", purchaseFile);
    if (consumptionFile) formData.append("consumption_file", consumptionFile);
    if (directFile) formData.append("direct_file", directFile);
    if (indirectFile) formData.append("indirect_file", indirectFile);
    if (otherIncomeFile) formData.append("other_income_file", otherIncomeFile);
    if (sessionId) formData.append("session_id", sessionId);

    try {
      const result = await uploadMutation.mutateAsync({ formData, sessionId });
      const parts = [];
      if (result.sales_rows > 0) parts.push(`${result.sales_rows} sales`);
      if (result.purchase_rows > 0) parts.push(`${result.purchase_rows} purchase`);
      if (result.consumption_rows > 0) parts.push(`${result.consumption_rows} consumption`);
      if (result.direct_expense_rows > 0) parts.push(`${result.direct_expense_rows} direct expenses`);
      if (result.indirect_expense_rows > 0) parts.push(`${result.indirect_expense_rows} indirect expenses`);
      if (result.other_income_rows > 0) parts.push(`${result.other_income_rows} other income`);
      
      if (result.session_id) {
        setSessionId(result.session_id);
      }
      
      const months = result.months ?? [result.month];
      months.forEach((m: string) => addMonth(m));
      
      setUploadResult({ success: true, message: `Successfully uploaded: ${parts.join(", ")}!` });
      
      setTimeout(() => {
        navigate({ to: "/income-statement" });
      }, 1500);
    } catch (error: any) {
      setUploadResult({ success: false, message: error.response?.data?.detail || "Upload failed" });
    }
  };

  const selectedCount = [salesFile, purchaseFile, consumptionFile, directFile, indirectFile, otherIncomeFile].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Data"
        description="Upload your financial data files"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Upload className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Data Upload Center</h2>
                <p className="text-sm text-gray-500">Upload Excel files for analysis</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Sales & Purchase Data</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/50 ${salesFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setSalesFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${salesFile ? 'text-green-600' : 'text-blue-500'}`} size={40} />
                    <p className={`font-medium ${salesFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {salesFile ? salesFile.name : 'Sales Data'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">ACPL Sales file</p>
                    {salesFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>

                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/50 ${purchaseFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${purchaseFile ? 'text-green-600' : 'text-purple-500'}`} size={40} />
                    <p className={`font-medium ${purchaseFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {purchaseFile ? purchaseFile.name : 'Purchase Data'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">ACPL Purchase file</p>
                    {purchaseFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>

                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/50 ${consumptionFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setConsumptionFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${consumptionFile ? 'text-green-600' : 'text-amber-500'}`} size={40} />
                    <p className={`font-medium ${consumptionFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {consumptionFile ? consumptionFile.name : 'Consumption Data'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Stock consumption file</p>
                    {consumptionFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Receipt className="text-red-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Expenses Data</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-red-400 hover:bg-red-50/50 ${directFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setDirectFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${directFile ? 'text-green-600' : 'text-red-500'}`} size={40} />
                    <p className={`font-medium ${directFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {directFile ? directFile.name : 'Direct Expenses'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Direct expenses file</p>
                    {directFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>

                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-orange-400 hover:bg-orange-50/50 ${indirectFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setIndirectFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${indirectFile ? 'text-green-600' : 'text-orange-500'}`} size={40} />
                    <p className={`font-medium ${indirectFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {indirectFile ? indirectFile.name : 'Indirect Expenses'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Indirect expenses file</p>
                    {indirectFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>

                  <label className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-green-400 hover:bg-green-50/50 ${otherIncomeFile ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => setOtherIncomeFile(e.target.files?.[0] || null)} className="hidden" />
                    <FileSpreadsheet className={`mx-auto mb-3 ${otherIncomeFile ? 'text-green-600' : 'text-green-500'}`} size={40} />
                    <p className={`font-medium ${otherIncomeFile ? 'text-green-700' : 'text-gray-700'}`}>
                      {otherIncomeFile ? otherIncomeFile.name : 'Other Income'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Discount received etc.</p>
                    {otherIncomeFile && (
                      <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                        <CheckCircle className="text-white" size={16} />
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <button 
              onClick={handleUpload} 
              disabled={selectedCount === 0 || uploadMutation.isPending} 
              className={`w-full mt-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                selectedCount > 0 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload {selectedCount > 0 ? `${selectedCount} file${selectedCount > 1 ? 's' : ''}` : 'Files'}
                </>
              )}
            </button>

            {uploadResult && (
              <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${uploadResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {uploadResult.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                <span className="font-medium">{uploadResult.message}</span>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileSpreadsheet className="text-purple-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Quick Guide</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800 mb-1">Sales Data</p>
                <p className="text-blue-600">Upload ACPL Sales Excel file with sales transactions</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium text-purple-800 mb-1">Purchase Data</p>
                <p className="text-purple-600">Upload ACPL Purchase Excel file with purchase transactions</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="font-medium text-amber-800 mb-1">Consumption Data</p>
                <p className="text-amber-600">Upload consumption/stock file for COGS calculation</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-800 mb-1">Direct Expenses</p>
                <p className="text-red-600">Upload direct expenses ledger</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-medium text-orange-800 mb-1">Indirect Expenses</p>
                <p className="text-orange-600">Upload indirect expenses ledger</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-green-800 mb-1">Other Income</p>
                <p className="text-green-600">Upload discount received and other income data</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <h3 className="text-lg font-semibold mb-2">Supported Formats</h3>
            <p className="text-sm text-blue-100 mb-4">Upload Excel files (.xlsx, .xls) only</p>
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg">
              <CheckCircle size={20} />
              <span className="text-sm">Files are processed securely in memory</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
