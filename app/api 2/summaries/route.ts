import { NextRequest, NextResponse } from "next/server";
import {
  isSafeFilename,
  listSummaries,
  writeSummary,
} from "@/lib/summaries-server";

export function GET() {
  return NextResponse.json({ summaries: listSummaries() });
}

export async function POST(req: NextRequest) {
  let body: { filename?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { filename, content } = body;
  if (!filename || !isSafeFilename(filename) || typeof content !== "string") {
    return new NextResponse("Invalid filename or content", { status: 400 });
  }

  writeSummary(filename, content);
  return NextResponse.json({ ok: true, filename }, { status: 201 });
}
