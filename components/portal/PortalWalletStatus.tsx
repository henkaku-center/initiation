// ABOUTME: Preserve the reference wallet readings without inventing on-chain balances.
// ABOUTME: Both Setup and Passport make the unavailable lookups explicit.
export function PortalWalletStatus() {
  return <div className="pd-wallet-readings">
    <div><span className="pd-reading-label"><span className="pd-token-icon">H</span> HENKAKU TOKEN</span><strong>—</strong><span className="pd-reading-note">保有状況・残高の取得は準備中です。</span></div>
    <div><span className="pd-reading-label"><span className="pd-token-icon pd-outline-token">✓</span> ALLOWLIST</span><strong>—</strong><span className="pd-reading-note">オンチェーン登録状況の取得は準備中です。</span></div>
  </div>;
}
