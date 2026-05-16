import { NextRequest, NextResponse } from "next/server";
import { isSafeFilename, readSummary } from "@/lib/summaries-server";

type Params = { params: Promise<{ filename: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { filename } = await params;
  if (!isSafeFilename(filename)) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const content = readSummary(filename);
  if (content === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(content, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
