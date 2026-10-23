import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div>
        <div className="mb-5 grid size-11 place-items-center rounded-[14px] border border-[#f0dcd9] bg-[#fff5f3] text-danger">
          <CircleAlert className="size-5" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">This link is incomplete</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Password reset links contain a single-use token. Request a fresh link to continue.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
