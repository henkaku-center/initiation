"use client";

// A local, same-origin document preserves the references' own viewport/scroll math.
// All application links target the parent and return to the existing mock flows.
export function ReferenceGateway() {
  return <iframe className="pd-reference-gateway" src="/demo-assets/gateway/index.html" title="HENKAKU Community Gateway" />;
}
