export function demoRequestPolicy(
  demoOnly: boolean,
  method: string,
  pathname: string,
): "allow" | "block" | "redirect" {
  if (!demoOnly) return "allow";
  if (method !== "GET" && method !== "HEAD") return "block";
  if (pathname === "/api" || pathname.startsWith("/api/")) return "block";
  if (
    ["/", "/demo", "/favicon.ico", "/icon.svg"].includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/demo-assets/") ||
    pathname.startsWith("/music/")
  )
    return "allow";
  if (
    ["/setup", "/initiation", "/checkin", "/community", "/apply", "/passport", "/admin"].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  )
    return "redirect";
  return "block";
}
