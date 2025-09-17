import React, { useState, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
} from "lucide-react";

const DataImportPage = () => {
  const { getToken } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file,
      type: file.type,
      status: "pending", // pending, uploading, success, error
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    setUploadResults((prev) =>
      prev.filter((result) => result.fileId !== fileId)
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFile = async (fileData) => {
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("files", fileData.file);

      const response = await fetch("/api/ingest/excel?target=transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          data: result,
        };
      } else {
        return {
          success: false,
          error: result.message || "Upload failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || "Network error",
      };
    }
  };

  const handleUploadAll = async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);
    const results = [];

    for (const fileData of uploadedFiles) {
      // Update file status to uploading
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id ? { ...f, status: "uploading" } : f
        )
      );

      const result = await uploadFile(fileData);

      // Update file status based on result
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { ...f, status: result.success ? "success" : "error" }
            : f
        )
      );

      results.push({
        fileId: fileData.id,
        fileName: fileData.name,
        ...result,
      });
    }

    setUploadResults(results);
    setIsUploading(false);
  };

  const downloadSampleFile = () => {
    const sampleData = [
      ["Date", "Amount", "Type", "Category", "Description", "Account"],
      [
        "2024-01-15",
        "5000",
        "income",
        "Salary",
        "Monthly salary",
        "SBI Savings",
      ],
      [
        "2024-01-16",
        "500",
        "expense",
        "Food",
        "Grocery shopping",
        "SBI Savings",
      ],
      ["2024-01-17", "200", "expense", "Transport", "Uber ride", "SBI Savings"],
      [
        "2024-01-18",
        "1000",
        "expense",
        "Utilities",
        "Electricity bill",
        "SBI Savings",
      ],
      [
        "2024-01-20",
        "300",
        "expense",
        "Entertainment",
        "Movie tickets",
        "SBI Savings",
      ],
    ];

    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_transactions.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "uploading":
        return (
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        );
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Import</h1>
          <p className="text-gray-400">
            Upload Excel files to import your transaction data into Munim.AI
          </p>
        </div>

        {/* Sample File Download */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Need a template?</h3>
              <p className="text-gray-400 text-sm">
                Download a sample Excel file to see the expected format
              </p>
            </div>
            <button
              onClick={downloadSampleFile}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Sample
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Excel Files</h3>
            <p className="text-gray-400 mb-4">
              Click to select or drag and drop your Excel files here
            </p>
            <p className="text-sm text-gray-500">
              Supports .xlsx and .xls files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept=".xlsx,.xls"
            />
          </div>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Selected Files</h3>
              <button
                onClick={handleUploadAll}
                disabled={
                  isUploading ||
                  uploadedFiles.every((f) => f.status !== "pending")
                }
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                {isUploading ? "Uploading..." : "Upload All"}
              </button>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Results</h3>
            <div className="space-y-4">
              {uploadResults.map((result) => (
                <motion.div
                  key={result.fileId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 ${
                    result.success
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{result.fileName}</h4>
                      {result.success ? (
                        <div className="text-sm text-gray-300 mt-1">
                          <p>
                            ✅ Successfully imported {result.data.inserted}{" "}
                            transactions
                          </p>
                          {result.data.skipped > 0 && (
                            <p>
                              ⚠️ Skipped {result.data.skipped} duplicate
                              transactions
                            </p>
                          )}
                          {result.data.errors?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-yellow-400">Errors:</p>
                              <ul className="list-disc list-inside text-xs text-gray-400">
                                {result.data.errors.map((error, idx) => (
                                  <li key={idx}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-400 mt-1">
                          ❌ {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Format Guidelines */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            File Format Guidelines
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-400 mb-2">
                Required Columns:
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • <strong>Date:</strong> YYYY-MM-DD format
                </li>
                <li>
                  • <strong>Amount:</strong> Numeric value
                </li>
                <li>
                  • <strong>Type:</strong> "income" or "expense"
                </li>
                <li>
                  • <strong>Category:</strong> Transaction category
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">
                Optional Columns:
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • <strong>Description:</strong> Transaction details
                </li>
                <li>
                  • <strong>Account:</strong> Bank account name
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
            <strong>Note:</strong> The system supports flexible column naming.
            For example, "Date" can also be "transaction_date" or
            "date_of_transaction".
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportPage;
