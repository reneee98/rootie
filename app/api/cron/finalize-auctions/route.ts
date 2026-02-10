import { NextResponse } from "next/server";
import { finalizeEndedAuctions } from "@/lib/actions/finalize-auctions";

/**
 * Cron endpoint: finalizes ended auctions (sets winner, creates thread, deal_confirmed_at).
 * Call every 1–2 minutes (e.g. cron-job.org, Vercel Cron).
 *
 * Auth: require header "Authorization: Bearer <CRON_SECRET>" or "x-cron-secret: <CRON_SECRET>".
 * Set CRON_SECRET in env.
 */
async function handleFinalize(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-cron-secret");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : secretHeader;
  const expected = process.env.CRON_SECRET;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await finalizeEndedAuctions();
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      finalized: result.finalized,
      expired: result.expired,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleFinalize(request);
}

export async function POST(request: Request) {
  return handleFinalize(request);
}
