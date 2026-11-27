// Scope the existing Gateway stylesheet when its chapters share the portal page.
export function scopeGatewayStyles(css: string): string {
  return css
    .replace(/(\d+(?:\.\d+)?)svh\b/g, (_, value) => `calc(var(--gateway-viewport-height, 100svh) * ${Number(value) / 100})`)
    .replaceAll('html[data-theme="light"]', ':host([data-theme="light"])')
    .replaceAll('html[data-theme="dark"]', ':host([data-theme="dark"])')
    .replaceAll("html,body", ":host,.gateway-root")
    .replaceAll(":root", ":host")
    .replace(/(^|[},])\s*html\s*\{/gm, "$1 :host {")
    .replace(/(^|[},])\s*body\s*\{/gm, "$1 .gateway-root {");
}
