import React, { useEffect, useRef, useState, useId } from "react";
import { X } from "lucide-react";
export function Dialog({ title, onClose, children, className = "" }) {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const el = ref.current,
      previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"form-dialog wide-dialog " + className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Let the caller reject dismissal while an operation is still saving.
        event.preventDefault();
        onClose();
      }}
    >
      <header className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="module-empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function useMedia(query) {
  const [matches, setMatches] = useState(() =>
    Boolean(window.matchMedia?.(query).matches),
  );
  useEffect(() => {
    const media = window.matchMedia?.(query);
    const update = () => setMatches(Boolean(media?.matches));
    update();
    media?.addEventListener("change", update);
    return () => media?.removeEventListener("change", update);
  }, [query]);
  return matches;
}
