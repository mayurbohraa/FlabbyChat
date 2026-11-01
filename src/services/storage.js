// Cloudinary enforces allowed formats; the application checks the size limit.
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const storageConfigured = Boolean(cloudName && preset);

export const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export function validateFile(file, maxBytes) {
  if (!allowedTypes.includes(file.type))
    throw new Error("Choose a JPG, PNG, WebP, GIF, or PDF file.");
  if (file.size > maxBytes)
    throw new Error(
      `Choose a file smaller than ${maxBytes >= 1024 * 1024 ? "5 MB" : "250 KB"}.`,
    );
}

// Previews and downloads accept only Cloudinary URLs or supported embedded files.
export function safeAttachmentUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "res.cloudinary.com")
      return url.href;
    if (
      /^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,/.test(value)
    )
      return value;
    return null;
  } catch {
    return null;
  }
}

export async function prepareAttachment(file, local = false) {
  const useCloud = !local && storageConfigured;
  validateFile(file, useCloud ? 5 * 1024 * 1024 : 250 * 1024);
  let url;
  // The unsigned preset is public client configuration; no API secret is sent.
  if (useCloud) {
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", preset);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
      { method: "POST", body },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error?.message ||
          "Upload failed. Check your Cloudinary upload preset.",
      );
    url = safeAttachmentUrl(result.secure_url);
    if (!url)
      throw new Error("The upload service returned an invalid file URL.");
  } else {
    if (!local && file.type === "application/pdf")
      throw new Error(
        "Connect Cloudinary to send PDFs. See the storage setup in README.md.",
      );
    url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.readAsDataURL(file);
    });
  }
  return {
    name: file.name,
    url,
    kind: file.type === "application/pdf" ? "pdf" : "image",
    size: file.size,
  };
}

// Download a blob to retain the filename and keep the user inside the app.
export async function downloadAttachment(file) {
  const safeUrl = safeAttachmentUrl(file.url);
  if (!safeUrl) throw new Error("This file link is not supported.");
  const response = await fetch(safeUrl);
  if (!response.ok)
    throw new Error(
      "The download failed. Check your connection and try again.",
    );
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name || "attachment";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
