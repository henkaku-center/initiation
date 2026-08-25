// ABOUTME: SIWE 署名に使う一回限りの nonce を Cookie セッションへ発行する。
// ABOUTME: nonce は封緘 Cookie にだけ保存し、サーバー側ストアは持たない(単回性の扱いは docs/decisions/2026-08-24-siwe-nonce-single-use.md)。
import { generateNonce } from "siwe";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return Response.json({ nonce: session.nonce });
}
