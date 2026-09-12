import { NextResponse, type NextRequest } from "next/server";
import { demoRequestPolicy } from "@/lib/demo/boundary";

export function proxy(request: NextRequest) {
  const policy = demoRequestPolicy(
    process.env.HENKAKU_DEMO_ONLY === "1",
    request.method,
    request.nextUrl.pathname,
  );
  if (policy === "block")
    return new NextResponse(
      "This endpoint is unavailable in the experience demo.",
      { status: 404 },
    );
  if (policy === "redirect") {
    const destination = new URL("/", request.url);
    const page = request.nextUrl.pathname.split("/")[1];
    destination.hash = (
      {
        setup: "setup",
        initiation: "journey",
        checkin: "community",
        apply: "passport",
        admin: "passport",
      } as Record<string, string>
    )[page];
    return NextResponse.redirect(destination);
  }
  return NextResponse.next();
}
