import React, { useState } from "react";
import { safeAttachmentUrl } from "../services/storage.js";

export default function Avatar({ name = "?", photoURL, className = "avatar" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = safeAttachmentUrl(photoURL);
  if (url && failedUrl !== url)
    return (
      <img
        className={className}
        src={url}
        alt={name}
        onError={() => setFailedUrl(url)}
      />
    );
  return (
    <span className={className} aria-hidden="true">
      {(name || "?")
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
