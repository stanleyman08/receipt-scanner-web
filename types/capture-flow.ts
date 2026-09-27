import type { BucketKey } from "./bucket";
import type { Receipt, ReceiptDetails } from "./receipt";

export type ProcessingStage = "deskewing" | "optimizing" | "analyzing" | "extracting";

/** A receipt on the review screen: its details, the bucket it will be filed in, and whether that was picked by hand. */
export interface ReceiptReview {
  details: ReceiptDetails;
  bucket: BucketKey;
  pickedByHand: boolean;
  /** The bucket selected for the scan (or the receipt's own bucket when editing), used when there's no receipt date. */
  selected: BucketKey;
}

export type CaptureFlowState =
  | { status: "idle" }
  | { status: "camera_active" }
  | { status: "processing"; imageData: string; stage: ProcessingStage }
  | { status: "editing"; imageData: string; review: ReceiptReview; error?: string }
  | { status: "saving"; imageData: string; review: ReceiptReview }
  | { status: "success"; imageData: string; receipt: Receipt; bucket: BucketKey }
  | { status: "error"; imageData: string; error: string };
