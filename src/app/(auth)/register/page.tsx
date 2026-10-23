import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/session";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata = { title: "Create your gym" };

export default async function RegisterPage() {
  const auth = await getAuth();
  if (auth) redirect(auth.profile.role === "owner" ? "/dashboard" : "/me");
  return <RegisterForm />;
}
