import { Receipt, ParsedReceiptData, ReceiptInsert } from './receipt';

export type ProcessingStage = 'optimizing' | 'analyzing' | 'extracting';

export type CaptureFlowState =
  | { status: 'idle' }
  | { status: 'camera_active' }
  | { status: 'processing'; imageData: string; stage: ProcessingStage }
  | { status: 'editing'; imageData: string; parsedData: ParsedReceiptData }
  | { status: 'saving'; imageData: string; receiptData: ReceiptInsert }
  | { status: 'success'; imageData: string; receipt: Receipt }
  | { status: 'error'; imageData: string; error: string };
