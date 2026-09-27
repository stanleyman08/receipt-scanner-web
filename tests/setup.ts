import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Testing Library only cleans up on its own when Vitest globals are on; they're off here.
if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
