"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const WRONG_CREDENTIALS = 401;
const TOO_MANY_ATTEMPTS = 429;
const WRONG_DETAILS = "That email and password don't match. Check them and try again.";
const RATE_LIMITED = "Too many sign-in attempts. Wait a minute, then try again.";
const SIGN_IN_FAILED = "Signing in didn't work. Check your connection and try again.";

function signInErrorMessage(status: number): string {
  if (status === WRONG_CREDENTIALS) return WRONG_DETAILS;
  if (status === TOO_MANY_ATTEMPTS) return RATE_LIMITED;
  return SIGN_IN_FAILED;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Through Better Auth's HTTP endpoint, which applies the sign-in rate limit.
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setError(signInErrorMessage(signInError.status));
        setIsLoading(false);
        return;
      }
      // Stays "Signing in…" until the receipts page replaces this one.
      router.push("/");
      router.refresh();
    } catch {
      setError(SIGN_IN_FAILED);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Receipt Scanner</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
