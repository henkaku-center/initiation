// ABOUTME: Portal links preserve normal URLs and recognize the old demo bookmarks.
// ABOUTME: Unknown fragments never become arbitrary navigation destinations.
import { describe, expect, it } from "vitest";
import { portalRoutes, legacyPortalDestination } from "@/lib/portal/navigation";

describe("portal navigation", () => {
  it("maps the five screens to directly addressable application routes", () => {
    expect(portalRoutes).toEqual({ home: "/", setup: "/setup", journey: "/initiation", community: "/community", passport: "/passport" });
  });
  it.each([["#setup", "/setup"], ["#journey", "/initiation"], ["#community", "/community"], ["#passport", "/passport"]])("keeps the old %s bookmark useful", (hash, route) => {
    expect(legacyPortalDestination(hash)).toBe(route);
  });
  it.each(["", "#home", "#unknown", "#https://example.com", "#__proto__"])("does not redirect %s", (hash) => {
    expect(legacyPortalDestination(hash)).toBeNull();
  });
});
