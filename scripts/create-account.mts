// Creates the one shared account, or resets its password if it exists. Either way, every device is signed out.
// The password comes from the environment so it stays out of shell history:
//   read -r ACCOUNT_EMAIL; read -rs ACCOUNT_PASSWORD; export ACCOUNT_EMAIL ACCOUNT_PASSWORD; pnpm create-account
import { createAuth } from "../lib/auth.ts";

// Better Auth's own minimum. Checked here too, because resetting a password skips Better Auth's check.
const MIN_PASSWORD_LENGTH = 8;
const ACCOUNT_NAME = "Carino";

const email = process.env.ACCOUNT_EMAIL?.trim().toLowerCase();
const password = process.env.ACCOUNT_PASSWORD;

if (!email || !password) {
  console.error("Set ACCOUNT_EMAIL and ACCOUNT_PASSWORD first (see the comment at the top of this script).");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}

// Sign-up is off in the app; this instance allows it so the account can be created here.
const auth = createAuth({ allowSignUp: true });
const context = await auth.$context;
const existing = await context.internalAdapter.findUserByEmail(email, { includeAccounts: true });

let userId: string;
if (existing) {
  userId = existing.user.id;
  const hashed = await context.password.hash(password);
  const credential = await context.internalAdapter.findCredentialAccount(userId);
  if (credential) {
    await context.internalAdapter.updatePassword(userId, hashed);
  } else {
    await context.internalAdapter.createAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hashed,
    });
  }
  console.log(`Reset the password for ${email}.`);
} else {
  const { user } = await auth.api.signUpEmail({ body: { email, password, name: ACCOUNT_NAME } });
  userId = user.id;
  console.log(`Created the shared account ${email}.`);
}

await context.internalAdapter.deleteUserSessions(userId);
console.log("Signed out every device.");
// The database pool keeps the process alive otherwise.
process.exit(0);
