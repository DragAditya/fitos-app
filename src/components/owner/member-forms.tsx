"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  MoreHorizontal,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";
import { memberCreateSchema, memberUpdateSchema, type MemberCreateInput, type MemberUpdateInput } from "@/lib/validation";
import type { MemberRow } from "@/server/db/types";
import { createMemberAction, resendMemberInviteAction, setMemberStatusAction, updateMemberAction } from "@/server/actions/members";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { CopyField } from "@/components/forms/copy-button";
import { useActionRunner } from "@/components/forms/use-action-runner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function FormError({ message }: { message?: string }) {
  return message ? <Alert variant="danger" className="mb-3">{message}</Alert> : null;
}

export function AddMemberDialog({ today }: { today: string }) {
  const [open, setOpen] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string>();
  const { run, pending } = useActionRunner();
  const form = useForm<MemberCreateInput>({
    resolver: zodResolver(memberCreateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      joinedAt: today,
      emergencyContact: "",
      notes: "",
    },
  });

  async function onSubmit(values: MemberCreateInput) {
    setServerError(undefined);
    const result = await run(() => createMemberAction(values), {
      refresh: true,
      onSuccess: (data) => setInviteUrl(data.inviteUrl),
    });
    if (result && !result.ok) {
      setServerError(result.error);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) form.setError(field as keyof MemberCreateInput, { message: messages[0] });
      });
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServerError(undefined);
      setInviteUrl(null);
      form.reset({ fullName: "", email: "", phone: "", joinedAt: today, emergencyContact: "", notes: "" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <UserPlus /> Add member
      </Button>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{inviteUrl ? "Member added" : "Add a member"}</DialogTitle>
          <DialogDescription>
            {inviteUrl
              ? "Share this single-use invitation so they can activate their FitOS account."
              : "Create the member profile first. You can assign a plan right after."}
          </DialogDescription>
        </DialogHeader>
        {inviteUrl ? (
          <DialogBody>
            <Alert variant="success" className="mb-4">
              The member record is live. The invite expires in seven days and replaces any earlier link.
            </Alert>
            <p className="mb-2 text-[11.5px] font-medium text-muted">Invitation link</p>
            <CopyField value={inviteUrl} />
            <p className="mt-3 text-[11px] leading-relaxed text-soft">
              No email provider is configured in this deployment, so copy the link and share it
              directly. The member will set their own password.
            </p>
          </DialogBody>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-3.5">
              <FormError message={serverError} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="member-name" error={form.formState.errors.fullName?.message}>
                  <Input id="member-name" placeholder="Priya Shah" {...form.register("fullName")} />
                </Field>
                <Field label="Email" htmlFor="member-email" error={form.formState.errors.email?.message}>
                  <Input id="member-email" type="email" placeholder="priya@example.com" {...form.register("email")} />
                </Field>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Phone" htmlFor="member-phone" hint="Optional" error={form.formState.errors.phone?.message}>
                  <Input id="member-phone" placeholder="+91 98765 43210" {...form.register("phone")} />
                </Field>
                <Field label="Joined on" htmlFor="member-joined" error={form.formState.errors.joinedAt?.message}>
                  <Input id="member-joined" type="date" {...form.register("joinedAt")} />
                </Field>
              </div>
              <Field label="Emergency contact" htmlFor="member-emergency" hint="Optional" error={form.formState.errors.emergencyContact?.message}>
                <Input id="member-emergency" placeholder="Name and phone" {...form.register("emergencyContact")} />
              </Field>
              <Field label="Notes" htmlFor="member-notes" hint="Optional" error={form.formState.errors.notes?.message}>
                <Textarea id="member-notes" placeholder="Injuries, goals or front-desk context…" {...form.register("notes")} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null} Add member
              </Button>
            </DialogFooter>
          </form>
        )}
        {inviteUrl ? (
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>Done</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
                toast.success("Invite link copied.");
              }}
            >
              <Copy /> Copy invite
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function MemberEditForm({ member }: { member: MemberRow }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string>();
  const { run, pending } = useActionRunner();
  const form = useForm<MemberUpdateInput>({
    resolver: zodResolver(memberUpdateSchema),
    defaultValues: {
      fullName: member.full_name,
      email: member.email,
      phone: member.phone ?? "",
      dateOfBirth: member.date_of_birth ?? "",
      address: member.address ?? "",
      status: member.status,
      joinedAt: member.joined_at,
      emergencyContact: member.emergency_contact ?? "",
      notes: member.notes ?? "",
    },
  });

  async function onSubmit(values: MemberUpdateInput) {
    setServerError(undefined);
    const result = await run(() => updateMemberAction(member.id, values), {
      onSuccess: () => router.push(`/members/${member.id}`),
    });
    if (result && !result.ok) {
      setServerError(result.error);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) form.setError(field as keyof MemberUpdateInput, { message: messages[0] });
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormError message={serverError} />
      <div className="rounded-[20px] border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-[13px] font-semibold">Profile details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="edit-name" error={form.formState.errors.fullName?.message}>
            <Input id="edit-name" {...form.register("fullName")} />
          </Field>
          <Field label="Email" htmlFor="edit-email" error={form.formState.errors.email?.message}>
            <Input id="edit-email" type="email" {...form.register("email")} />
          </Field>
          <Field label="Phone" htmlFor="edit-phone" error={form.formState.errors.phone?.message}>
            <Input id="edit-phone" {...form.register("phone")} />
          </Field>
          <Field label="Date of birth" htmlFor="edit-dob" error={form.formState.errors.dateOfBirth?.message}>
            <Input id="edit-dob" type="date" {...form.register("dateOfBirth")} />
          </Field>
          <Field label="Address" htmlFor="edit-address" error={form.formState.errors.address?.message} className="sm:col-span-2">
            <Input id="edit-address" {...form.register("address")} />
          </Field>
        </div>
      </div>
      <div className="rounded-[20px] border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-[13px] font-semibold">Gym record</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="edit-status" error={form.formState.errors.status?.message}>
            <NativeSelect id="edit-status" {...form.register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </NativeSelect>
          </Field>
          <Field label="Joined on" htmlFor="edit-joined" hint="Set when the member was added" error={form.formState.errors.joinedAt?.message}>
            <Input id="edit-joined" type="date" readOnly className="bg-[#fbfbf8] text-muted" {...form.register("joinedAt")} />
          </Field>
          <Field label="Emergency contact" htmlFor="edit-emergency" error={form.formState.errors.emergencyContact?.message}>
            <Input id="edit-emergency" {...form.register("emergencyContact")} />
          </Field>
          <Field label="Member code" htmlFor="edit-code" hint="Assigned by FitOS">
            <Input id="edit-code" value={member.member_code} disabled readOnly />
          </Field>
          <Field label="Notes" htmlFor="edit-notes" error={form.formState.errors.notes?.message} className="sm:col-span-2">
            <Textarea id="edit-notes" {...form.register("notes")} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push(`/members/${member.id}`)}>Cancel</Button>
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Save changes
        </Button>
      </div>
    </form>
  );
}

export function MemberActions({ member }: { member: MemberRow }) {
  const { run, pending } = useActionRunner();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  async function setStatus(status: "active" | "inactive" | "suspended") {
    await run(() => setMemberStatusAction(member.id, status));
  }

  async function resendInvite() {
    const result = await run(() => resendMemberInviteAction(member.id));
    if (result?.ok) {
      setInviteUrl(result.data.inviteUrl);
      setInviteOpen(true);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />} Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{member.full_name}</DropdownMenuLabel>
          {!member.has_password ? (
            <DropdownMenuItem onSelect={resendInvite}>
              <Link2 /> Create invite link
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {member.status !== "active" ? (
            <DropdownMenuItem onSelect={() => setStatus("active")}>
              <UserRoundCheck /> Mark active
            </DropdownMenuItem>
          ) : null}
          {member.status !== "suspended" ? (
            <DropdownMenuItem onSelect={() => setStatus("suspended")}>
              <UserRoundX /> Suspend access
            </DropdownMenuItem>
          ) : null}
          {member.status !== "inactive" ? (
            <DropdownMenuItem onSelect={() => setStatus("inactive")}>
              <UserRoundX /> Mark inactive
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Invitation link</DialogTitle>
            <DialogDescription>
              Share this with {member.email}. It replaces any previous invitation and expires in seven days.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {inviteUrl ? <CopyField value={inviteUrl} /> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Close</Button>
            {inviteUrl ? (
              <Button
                variant="primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success("Invite link copied.");
                }}
              >
                <Copy /> Copy
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CancelMembershipButton({
  membershipId,
  memberId,
  label = "Cancel membership",
}: {
  membershipId: string;
  memberId: string;
  label?: string;
}) {
  const { run, pending } = useActionRunner();
  const cancel = React.useCallback(async () => {
    const { cancelMembershipAction } = await import("@/server/actions/memberships");
    await run(() => cancelMembershipAction(membershipId, memberId));
  }, [membershipId, memberId, run]);
  return (
    <ConfirmDialog
      title="Cancel this membership?"
      description="The member will lose check-in access immediately. Payment records are retained. This cannot be undone."
      confirmLabel="Cancel membership"
      destructive
      onConfirm={cancel}
      trigger={<Button variant="outlineDanger" size="sm" disabled={pending}>{label}</Button>}
    />
  );
}

export function InviteHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-soft">
      <Check className="size-3 text-positive" /> Invite only
    </span>
  );
}
