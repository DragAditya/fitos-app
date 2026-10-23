"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { manualCheckInAction } from "@/server/actions/attendance";

export function ManualCheckInDialog({
  members,
}: {
  members: Array<{ id: string; full_name: string; member_code: string; status: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{
    status: "success" | "rejected";
    message: string;
    memberName?: string;
  } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMemberId = String(new FormData(event.currentTarget).get("memberId") ?? "");
    if (!submittedMemberId) return;
    setPending(true);
    setResult(null);
    const response = await manualCheckInAction({ memberId: submittedMemberId });
    setPending(false);
    if (!response.ok) {
      setResult({ status: "rejected", message: response.error });
      return;
    }
    setResult(response.data);
    if (response.data.status === "success") {
      setMemberId("");
      router.refresh();
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setResult(null);
      setMemberId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserCheck /> Manual check-in
      </Button>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Manual check-in</DialogTitle>
          <DialogDescription>
            Use this when a member cannot scan the live code. The same eligibility and duplicate rules apply.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody className="space-y-3.5">
            {result ? (
              <Alert variant={result.status === "success" ? "success" : "danger"}>
                <span className="font-semibold">{result.memberName ? `${result.memberName}: ` : ""}</span>
                {result.message}
              </Alert>
            ) : null}
            <Field label="Member" htmlFor="manual-member">
              <NativeSelect
                id="manual-member"
                name="memberId"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                required
              >
                <option value="">Choose a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.full_name} · {member.member_code}</option>
                ))}
              </NativeSelect>
            </Field>
            <p className="text-[10.5px] leading-relaxed text-soft">
              A second check-in on the same day is rejected. Inactive, suspended or expired memberships cannot enter.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Close</Button>
            <Button type="submit" variant="gradient" disabled={pending || !memberId}>
              {pending ? <Loader2 className="animate-spin" /> : null} Record check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
