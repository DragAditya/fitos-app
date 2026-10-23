import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { isPastISO } from "@/lib/dates";
import { findInvite } from "@/server/services/accounts";
import { JoinForm } from "@/components/forms/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Join your gym" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite || invite.has_password) {
    return (
      <div>
        <div className="mb-5 grid size-11 place-items-center rounded-[14px] border border-[#f0dcd9] bg-[#fff5f3] text-danger">
          <CircleAlert className="size-5" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">
          {invite?.has_password ? "This account is already active" : "Invitation not found"}
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {invite?.has_password
            ? "Sign in with your existing FitOS password, or use the forgot-password flow."
            : "This link is invalid, has already been used, or was replaced. Ask your gym owner for a fresh invitation."}
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="gradient" className="flex-1">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/forgot-password">Reset password</Link>
          </Button>
        </div>
      </div>
    );
  }

  const expired = isPastISO(invite.invite_expires_at);
  if (expired) {
    return (
      <div>
        <div className="mb-5 grid size-11 place-items-center rounded-[14px] border border-[#f0e1c4] bg-[#fffaf0] text-warning">
          <CircleAlert className="size-5" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">Invitation expired</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Invitations last seven days. Ask {invite.gym_name} for a fresh link and we will bring you
          straight back here.
        </p>
        <Button asChild variant="secondary" className="mt-6 w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <JoinForm
      token={token}
      gymName={invite.gym_name}
      email={invite.email}
      suggestedName={invite.full_name}
    />
  );
}
