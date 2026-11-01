import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// Bundle the worker with the app rather than relying on an external CDN.
GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfViewer({ data, name }) {
  const [document, setDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const container = useRef(null),
    canvas = useRef(null);
  useEffect(() => {
    let disposed = false;
    setError("");
    setDocument(null);
    setPage(1);
    const task = getDocument({
      // PDF.js can transfer the buffer to its worker; preserve the caller's bytes.
      data: data.slice(),
      enableXfa: false,
      useSystemFonts: true,
    });
    task.promise
      .then((pdf) => {
        if (!disposed) setDocument(pdf);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "This PDF could not be displayed. It may be damaged or password protected.",
          );
      });
    return () => {
      disposed = true;
      void task.destroy();
    };
  }, [data]);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(180, node.clientWidth - 32));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    let disposed = false,
      task;
    setRendering(true);
    setError("");
    (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (disposed) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: Math.min(width / base.width, 1.5) * zoom,
        });
        // Bound canvas memory on large pages and high-density displays.
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          2400 / viewport.width,
          3600 / viewport.height,
        );
        const element = canvas.current;
        element.width = Math.floor(viewport.width * ratio);
        element.height = Math.floor(viewport.height * ratio);
        element.style.width = viewport.width + "px";
        element.style.height = viewport.height + "px";
        task = pdfPage.render({
          canvas: element,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        await task.promise;
        if (!disposed) setRendering(false);
      } catch (err) {
        if (!disposed && err.name !== "RenderingCancelledException") {
          setRendering(false);
          setError(
            "This page could not be displayed. Try another page or download a copy.",
          );
        }
      }
    })();
    return () => {
      disposed = true;
      // A new page/zoom render must not race the previous canvas task.
      task?.cancel();
    };
  }, [document, page, zoom, width]);
  return (
    <section
      className="pdf-viewer"
      role="region"
      aria-label={"Preview of " + name}
    >
      <div className="pdf-controls">
        <div className="control-actions">
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={!document || page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {page} of {document?.numPages || "…"}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={!document || page >= document.numPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="control-actions">
          <button
            className="icon-button"
            aria-label="Zoom out"
            disabled={!document || zoom <= 0.5}
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            <Minus size={17} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            className="icon-button"
            aria-label="Zoom in"
            disabled={!document || zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
      <div className="pdf-pages" ref={container}>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!error && rendering && (
          <p role="status" className="pdf-loading">
            Rendering page…
          </p>
        )}
        <canvas
          ref={canvas}
          role="img"
          aria-label={name + ", page " + page}
          hidden={Boolean(error)}
        />
      </div>
    </section>
  );
}
