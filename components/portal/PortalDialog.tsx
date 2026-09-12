// ABOUTME: Display portal details in a modal dialog with native focus containment.
// ABOUTME: Escape and the close button return focus to the triggering control.
"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function PortalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    return () => {
      node?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="pd-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pd-dialog-inner">
        <div className="pd-dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="pd-icon-button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
