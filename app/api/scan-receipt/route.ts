import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeReceipt } from "@/lib/textract";
import type { ScanResponse } from "@/types/receipt";

const DATA_URL_PREFIX = /^data:image\/\w+;base64,/;

export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse>> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Your session has ended. Sign in again to continue." },
      { status: 401 },
    );
  }

  try {
    const { image } = await request.json();
    if (typeof image !== "string" || image === "") {
      return NextResponse.json({ success: false, error: "No photo was sent. Take the photo again." }, { status: 400 });
    }

    const imageBytes = Buffer.from(image.replace(DATA_URL_PREFIX, ""), "base64");
    const details = await analyzeReceipt(imageBytes);
    return NextResponse.json({ success: true, details });
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return NextResponse.json(
      { success: false, error: "The receipt couldn't be read. Try again, or retake the photo." },
      { status: 500 },
    );
  }
}
