import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/session";
import { allowDemoLogin } from "@/server/env";
import { LoginForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demoError?: string; reset?: string }>;
}) {
  const auth = await getAuth();
  if (auth) redirect(auth.profile.role === "owner" ? "/dashboard" : "/me");
  const params = await searchParams;
  return (
    <>
      {params.demoError ? (
        <Alert variant="danger" className="mb-5">
          The demo account could not be opened. Try the email and password shown below.
        </Alert>
      ) : null}
      {params.reset ? (
        <Alert variant="success" className="mb-5">
          Password updated. Sign in with your new password.
        </Alert>
      ) : null}
      <LoginForm next={params.next} demoEnabled={allowDemoLogin()} />
    </>
  );
}
