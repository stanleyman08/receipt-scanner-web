import type { BucketKey } from "./bucket";
import type { Receipt, ReceiptDetails } from "./receipt";

export type ProcessingStage = "deskewing" | "optimizing" | "analyzing" | "extracting";

/** A receipt on the review screen: its details, the bucket it will be filed in, and whether that was picked by hand. */
export interface ReceiptReview {
  details: ReceiptDetails;
  bucket: BucketKey;
  pickedByHand: boolean;
}

export type CaptureFlowState =
  | { status: "idle" }
  | { status: "camera_active" }
  | { status: "processing"; imageData: string; stage: ProcessingStage }
  | { status: "editing"; imageData: string; review: ReceiptReview; error?: string }
  | { status: "saving"; imageData: string; review: ReceiptReview }
  | { status: "success"; imageData: string; receipt: Receipt }
  | { status: "error"; imageData: string; error: string };
