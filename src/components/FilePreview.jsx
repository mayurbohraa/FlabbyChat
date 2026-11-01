import React, { useEffect, useState, lazy, Suspense } from "react";
import { Download, FileText } from "lucide-react";
import { Dialog } from "./ui.jsx";
import { safeAttachmentUrl, downloadAttachment } from "../services/storage.js";
import { friendlyError } from "../utils/chat-data.js";
const PdfViewer = lazy(() => import("./PdfViewer.jsx"));
export default function FilePreview({ file, onClose, onNotice }) {
  const [pdfData, setPdfData] = useState(null);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const safeUrl = safeAttachmentUrl(file.url);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    setError("");
    setPdfData(null);
    if (!safeUrl) {
      setError("This file link is not supported.");
      return;
    }
    if (file.kind !== "pdf") return;
    (async () => {
      try {
        const response = await fetch(safeUrl, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            "The document could not be loaded. Check your connection and try again.",
          );
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024)
          throw new Error("This document exceeds the 5 MB preview limit.");
        const signature = await blob.slice(0, 5).text();
        if (signature !== "%PDF-")
          throw new Error("This file is not a valid PDF document.");
        if (disposed) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (!disposed) setPdfData(bytes);
      } catch (err) {
        if (!disposed) setError(friendlyError(err));
      }
    })();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [safeUrl, file.kind, retry]);
  return (
    <Dialog
      title={file.name || "File preview"}
      onClose={onClose}
      className="file-preview-dialog"
    >
      <div className="file-preview-toolbar">
        <span>
          <FileText size={16} />
          {file.kind === "pdf" ? "PDF document" : "Image"}
          {file.size ? " · " + (file.size / 1024).toFixed(0) + " KB" : ""}
        </span>
        <button
          className="secondary"
          disabled={busy || !safeUrl}
          onClick={async () => {
            setBusy(true);
            setDownloadError("");
            try {
              await downloadAttachment(file);
              onNotice?.("Download started.");
            } catch (err) {
              setDownloadError(friendlyError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={16} />
          {busy ? "Downloading…" : "Download"}
        </button>
      </div>
      {downloadError && (
        <p className="error" role="alert">
          {downloadError}
        </p>
      )}
      <div className="file-preview-content">
        {error ? (
          <div className="preview-error">
            <p className="error" role="alert">
              {error}
            </p>
            {safeUrl && (
              <button className="secondary" onClick={() => setRetry(retry + 1)}>
                Try again
              </button>
            )}
          </div>
        ) : file.kind === "pdf" ? (
          pdfData ? (
            <Suspense fallback={<p role="status">Loading document viewer…</p>}>
              <PdfViewer data={pdfData} name={file.name} />
            </Suspense>
          ) : (
            <p role="status">Loading document…</p>
          )
        ) : (
          <img
            key={retry}
            src={safeUrl}
            alt={file.name || "Shared image"}
            onError={() =>
              setError(
                "The image could not be loaded. Check your connection and try again.",
              )
            }
          />
        )}
      </div>
      {file.kind === "pdf" && (
        <p className="preview-note">
          Use the page and zoom controls to read this document. Download saves a
          copy.
        </p>
      )}
    </Dialog>
  );
}
