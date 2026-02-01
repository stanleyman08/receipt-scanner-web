import { NextRequest, NextResponse } from 'next/server';
import { analyzeReceipt } from '@/lib/textract';
import { ParseReceiptResponse } from '@/types/receipt';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse<ParseReceiptResponse>> {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Remove base64 data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Analyze receipt with Textract
    const parsedData = await analyzeReceipt(imageBytes);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}
