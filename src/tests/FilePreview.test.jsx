import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import FilePreview from "../components/FilePreview.jsx";

vi.mock("../components/PdfViewer.jsx", () => ({
  default: ({ name }) => (
    <div role="region" aria-label={"Preview of " + name}>
      PDF page
    </div>
  ),
}));

const file = {
  name: "report.pdf",
  kind: "pdf",
  size: 200,
  url: "https://res.cloudinary.com/demo/raw/upload/report.pdf",
};

let revoke;

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const NativeURL = URL;
  revoke = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:preview");
      static revokeObjectURL = revoke;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads a PDF inside the app without an external link", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      blob: async () =>
        new NodeBlob(["%PDF-1.7 test"], { type: "application/pdf" }),
    }),
  );
  const { unmount } = render(<FilePreview file={file} onClose={vi.fn()} />);
  expect(
    await screen.findByRole("region", { name: "Preview of report.pdf" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  unmount();
  expect(revoke).not.toHaveBeenCalled();
});

it("shows a failed PDF load inline and lets the user retry", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Connection lost."))
    .mockResolvedValueOnce({
      ok: true,
      blob: async () => new NodeBlob(["%PDF-1.7 test"]),
    });
  vi.stubGlobal("fetch", request);
  render(<FilePreview file={file} onClose={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection lost.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("region", { name: "Preview of report.pdf" }),
  ).toBeInTheDocument();
});

it("rejects non-PDF content instead of embedding it", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new NodeBlob(["<html>Unexpected page</html>"]),
    }),
  );
  render(<FilePreview file={file} onClose={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("not a valid PDF");
  expect(
    screen.queryByRole("region", { name: "Preview of report.pdf" }),
  ).not.toBeInTheDocument();
});

it("does not request unsafe file links", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  render(
    <FilePreview
      file={{ ...file, url: "https://unknown.example/report.pdf" }}
      onClose={vi.fn()}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "link is not supported",
  );
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  expect(request).not.toHaveBeenCalled();
});
