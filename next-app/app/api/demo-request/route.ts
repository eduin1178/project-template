import { NextResponse } from "next/server";
import { demoRequestSchema } from "@/lib/validation/demo-request";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.DEMO_REQUEST_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, forwarded: false }, { status: 200 });
  }

  try {
    const forwarded = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!forwarded.ok) {
      return NextResponse.json(
        { ok: false, error: "webhook_failed", status: forwarded.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, forwarded: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "webhook_unreachable" },
      { status: 502 }
    );
  }
}
