import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth-session";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <LoginForm />;
}
