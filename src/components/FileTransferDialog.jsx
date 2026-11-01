import React, { useState } from "react";
import { Folder } from "lucide-react";
import { Dialog } from "./ui.jsx";
import { friendlyError } from "../utils/chat-data.js";
export default function FileTransferDialog({
  file,
  operation,
  folders,
  onClose,
  onTransfer,
  libraryName,
}) {
  const [folder, setFolder] = useState(file.folderId || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={(operation === "move" ? "Move" : "Copy") + " file"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="transfer-file-name">{file.name}</p>
      <p className="small-note">Choose a destination in {libraryName}.</p>
      <div
        className="destination-folders"
        role="radiogroup"
        aria-label="Destination folder"
      >
        {[
          { id: "", name: "All files (no folder)" },
          ...Object.values(folders || {}),
        ].map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={folder === f.id}
            onClick={() => setFolder(f.id)}
          >
            <Folder size={18} />
            <span>{f.name}</span>
            {folder === f.id && <strong>Selected</strong>}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={
            busy || (operation === "move" && folder === (file.folderId || ""))
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onTransfer(file, operation, folder);
              onClose();
            } catch (err) {
              setError(friendlyError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : operation === "move" ? "Move here" : "Copy here"}
        </button>
      </div>
    </Dialog>
  );
}
