import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, SIGNED_OUT_MESSAGE } from "@/lib/auth-session";
import { getSql } from "@/lib/db/sql";
import { saveScan } from "@/lib/receipt-store";
import { analyzeReceipt } from "@/lib/textract";
import type { ScanResponse } from "@/types/receipt";

const DATA_URL_PREFIX = /^data:image\/\w+;base64,/;
const scanRequestSchema = z.object({ image: z.string().min(1) });

export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse>> {
  if (!(await getSession())) {
    return NextResponse.json({ success: false, error: SIGNED_OUT_MESSAGE }, { status: 401 });
  }

  // A body that isn't JSON is treated like one without a photo.
  const parsed = scanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "No photo was sent. Take the photo again." }, { status: 400 });
  }

  try {
    const imageBytes = Buffer.from(parsed.data.image.replace(DATA_URL_PREFIX, ""), "base64");
    const { details, checkAmounts, textract } = await analyzeReceipt(imageBytes);
    // Kept once the response is sent, so the scan never waits on it. It only helps trace misreads later, so a scan
    // that can't be kept is logged rather than failed.
    after(() => saveScan(getSql(), textract, imageBytes).catch((error) => console.error("Error keeping scan:", error)));
    return NextResponse.json({ success: true, details, checkAmounts });
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return NextResponse.json(
      { success: false, error: "The receipt couldn't be read. Try again, or retake the photo." },
      { status: 500 },
    );
  }
}
