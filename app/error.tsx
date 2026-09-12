// ABOUTME: Keep data-loading failures recoverable without showing empty or successful records.
// ABOUTME: Retry the current page while keeping server error details out of the UI.
"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="pd-panel" role="alert"><h1>情報を取得できませんでした</h1><p className="portal-muted">通信状態を確認して、もう一度お試しください。</p><button type="button" className="pd-primary" onClick={reset}>再取得</button></main>;
}
