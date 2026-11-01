import React, { useState } from "react";
import { Folder } from "lucide-react";
import { Dialog } from "./ui.jsx";
import { friendlyError } from "../utils/chat-data.js";
export default function FileTransferDialog({
  file,
  operation,
  libraries,
  sourceLibrary,
  onClose,
  onTransfer,
}) {
  const [destination, setDestination] = useState(sourceLibrary),
    [folder, setFolder] = useState(file.folderId || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const library = libraries.find((item) => item.id === destination);
  return (
    <Dialog
      title={(operation === "move" ? "Move" : "Copy") + " file"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="transfer-file-name">{file.name}</p>
      <label>
        Destination library
        <select
          value={destination}
          disabled={busy}
          onChange={(event) => {
            setDestination(event.target.value);
            setFolder("");
            setError("");
          }}
        >
          {libraries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p className="small-note">
        {destination === "personal"
          ? "Choose a folder in My files."
          : "Members of this team can access files placed here."}
      </p>
      <div
        className="destination-folders"
        role="radiogroup"
        aria-label="Destination folder"
      >
        {[
          { id: "", name: "All files (no folder)" },
          ...Object.values(library?.folders || {}),
        ].map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={folder === f.id}
            disabled={busy}
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
            busy ||
            !library ||
            (operation === "move" &&
              destination === sourceLibrary &&
              folder === (file.folderId || ""))
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onTransfer(file, operation, folder, destination);
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
