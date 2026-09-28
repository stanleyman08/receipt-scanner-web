// Creates the one shared account, or resets its password if it exists. Either way, every device is signed out.
// The password comes from the environment so it stays out of shell history; running it all in a subshell keeps the
// password out of the terminal session, even when the script fails or is interrupted:
//   ( read -r ACCOUNT_EMAIL; read -rs ACCOUNT_PASSWORD; export ACCOUNT_EMAIL ACCOUNT_PASSWORD; pnpm create-account )
import { createAuth } from "../lib/auth.ts";

const ACCOUNT_NAME = "Carino";

const email = process.env.ACCOUNT_EMAIL?.trim().toLowerCase();
const password = process.env.ACCOUNT_PASSWORD;

if (!email || !password) {
  console.error("Set ACCOUNT_EMAIL and ACCOUNT_PASSWORD first (see the comment at the top of this script).");
  process.exit(1);
}

// Sign-up is off in the app; this instance allows it so the account can be created here.
const auth = createAuth({ allowSignUp: true });
const context = await auth.$context;

// Better Auth's own limits, checked here too because resetting a password skips Better Auth's checks.
const { minPasswordLength, maxPasswordLength } = context.password.config;
if (password.length < minPasswordLength || password.length > maxPasswordLength) {
  console.error(`Use a password of ${minPasswordLength} to ${maxPasswordLength} characters.`);
  process.exit(1);
}

// There's only one shared account: a second one, such as a typo in an earlier reset, would keep its own password and
// devices working whichever account is reset.
const accountCount = await context.internalAdapter.countTotalUsers();
if (accountCount > 1) {
  const accounts = await context.internalAdapter.listUsers(accountCount);
  const emails = accounts.map((account) => account.email).join(", ");
  console.error(`There should be one shared account, but ${accountCount} exist (${emails}). Delete the extras first.`);
  process.exit(1);
}

const existing = await context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
if (!existing && accountCount === 1) {
  // A different email is most likely a typo, and creating a second account would leave the old password working.
  const [sharedAccount] = await context.internalAdapter.listUsers(1);
  console.error(
    `The shared account is ${sharedAccount.email}. Set ACCOUNT_EMAIL to that address to reset its password.`,
  );
  process.exit(1);
}

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
