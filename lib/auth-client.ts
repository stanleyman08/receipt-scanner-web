import { createAuthClient } from "better-auth/react";

// Sign-in goes through the HTTP endpoint rather than a server action: Better Auth only rate-limits client requests.
export const authClient = createAuthClient();
