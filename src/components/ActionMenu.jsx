import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

// A body portal keeps menus clear of scroll-panel clipping.
export default function ActionMenu({
  label = "More options",
  actions,
  children,
  className = "icon-button",
  onOpen,
}) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null),
    menu = useRef(null);

  useEffect(() => {
    if (!open) return;
    const bounds = trigger.current.getBoundingClientRect();
    setPosition({
      top: Math.max(
        8,
        Math.min(bounds.bottom + 6, innerHeight - actions.length * 42 - 20),
      ),
      left: Math.max(8, Math.min(bounds.right - 190, innerWidth - 202)),
    });
    const dismiss = (e) => {
      if (e.type === "keydown") {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
        if (["ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          const items = [
            ...menu.current.querySelectorAll("button:not(:disabled)"),
          ];
          const current = items.indexOf(document.activeElement);
          items[
            (current + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length
          ]?.focus();
        }
        return;
      }
      if (
        !menu.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setOpen(false);
    };
    const close = () => setOpen(false);
    const focus = (e) => {
      if (
        !menu.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setOpen(false);
    };
    const scroll = (e) => {
      if (!menu.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("resize", close);
    document.addEventListener("focusin", focus);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    menu.current?.querySelector("button:not(:disabled)")?.focus();
    return () => {
      window.removeEventListener("resize", close);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [open, actions.length]);

  return (
    <>
      <button
        ref={trigger}
        className={className}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        {children || <MoreHorizontal size={18} />}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            className="action-popover"
            style={position}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                role="menuitem"
                disabled={action.disabled}
                className={action.danger ? "danger-item" : ""}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                  action.onSelect();
                }}
              >
                {action.Icon && <action.Icon size={16} />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
