"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function DemoDialog({
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
    node?.showModal();
    return () => node?.close();
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
