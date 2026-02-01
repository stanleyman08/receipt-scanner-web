import { NextRequest, NextResponse } from 'next/server';
import { saveReceipt } from '@/lib/supabase';
import { ReceiptInsert, SaveReceiptResponse } from '@/types/receipt';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse<SaveReceiptResponse>> {
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

    const receiptData: ReceiptInsert = await request.json();

    if (typeof receiptData.bucket_id !== 'string' || !receiptData.bucket_id) {
      return NextResponse.json(
        { success: false, error: 'bucket_id is required and must be a string' },
        { status: 400 }
      );
    }

    const receipt = await saveReceipt(receiptData);

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: 'Failed to save receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error('Error saving receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save receipt' },
      { status: 500 }
    );
  }
}
