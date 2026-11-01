import { afterEach, it, expect, vi } from "vitest";
import {
  prepareAttachment,
  validateFile,
  safeAttachmentUrl,
} from "../services/storage.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("prepares a local PDF without uploading it", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const file = await prepareAttachment(
    new File(["%PDF-1.7 test"], "report.pdf", { type: "application/pdf" }),
    true,
  );
  expect(file.kind).toBe("pdf");
  expect(file.url).toMatch(/^data:application\/pdf;base64,/);
  expect(fetcher).not.toHaveBeenCalled();
});

it("enforces accepted types and size limits", () => {
  expect(() =>
    validateFile(
      new File(["x"], "notes.html", { type: "text/html" }),
      250 * 1024,
    ),
  ).toThrow("Choose a JPG");
  expect(() =>
    validateFile(
      new File([new Uint8Array(260000)], "large.png", { type: "image/png" }),
      250 * 1024,
    ),
  ).toThrow("250 KB");
});

it("rejects executable and unexpected remote URLs", () => {
  expect(safeAttachmentUrl("javascript:alert(1)")).toBeNull();
  expect(safeAttachmentUrl("https://untrusted.example/file.pdf")).toBeNull();
  expect(
    safeAttachmentUrl("https://res.cloudinary.com/demo/image/upload/test.pdf"),
  ).toBeTruthy();
});

it("sends the configured preset to Cloudinary and retains file metadata", async () => {
  vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "cze8a37x");
  vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "FlabbyChat_uploads");
  vi.resetModules();
  const { prepareAttachment } = await import("../services/storage.js");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      secure_url: "https://res.cloudinary.com/cze8a37x/image/upload/test.pdf",
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  const attachment = await prepareAttachment(
    new File(["%PDF test"], "report.pdf", { type: "application/pdf" }),
  );
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, request] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.cloudinary.com/v1_1/cze8a37x/auto/upload");
  expect(request.body.get("upload_preset")).toBe("FlabbyChat_uploads");
  expect(attachment).toMatchObject({
    name: "report.pdf",
    kind: "pdf",
    url: "https://res.cloudinary.com/cze8a37x/image/upload/test.pdf",
  });
});

it("blocks a file above 5 MB before sending it to Cloudinary", async () => {
  vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "cze8a37x");
  vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "FlabbyChat_uploads");
  vi.resetModules();
  const { prepareAttachment } = await import("../services/storage.js");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(
    prepareAttachment(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ),
  ).rejects.toThrow("5 MB");
  expect(fetcher).not.toHaveBeenCalled();
});
