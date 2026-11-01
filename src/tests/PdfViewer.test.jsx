import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";

const mocked = vi.hoisted(() => ({ getDocument: vi.fn() }));

vi.mock("pdfjs-dist", () => ({
  getDocument: mocked.getDocument,
  GlobalWorkerOptions: {},
}));

import PdfViewer from "../components/PdfViewer.jsx";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("renders pages, changes zoom and destroys its PDF task when closed", async () => {
  const cancel = vi.fn(),
    destroy = vi.fn().mockResolvedValue();
  const page = {
    getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel })),
  };
  const getPage = vi.fn().mockResolvedValue(page);
  mocked.getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 2, getPage }),
    destroy,
  });
  const { unmount } = render(
    <PdfViewer data={new Uint8Array([1, 2, 3])} name="report.pdf" />,
  );
  await waitFor(() => expect(page.render).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(getPage).toHaveBeenCalledWith(2));
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("125%")).toBeInTheDocument();
  unmount();
  expect(destroy).toHaveBeenCalled();
  expect(cancel).toHaveBeenCalled();
});

it("shows document parsing errors inside the viewer", async () => {
  mocked.getDocument.mockReturnValue({
    promise: Promise.reject(new Error("Invalid document")),
    destroy: vi.fn().mockResolvedValue(),
  });
  render(<PdfViewer data={new Uint8Array([1])} name="bad.pdf" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "damaged or password protected",
  );
});
