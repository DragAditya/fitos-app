"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, Loader2, LockKeyhole, QrCode, Save, Send } from "lucide-react";
import { changePasswordSchema, profileSchema, type ChangePasswordInput, type ProfileInput } from "@/lib/validation";
import type { MemberNotification, MemberRow, RenewalRequest } from "@/server/db/types";
import { changeMyPasswordAction, updateMyProfileAction } from "@/server/actions/settings";
import { requestRenewalAction } from "@/server/actions/memberships";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { useActionRunner } from "@/components/forms/use-action-runner";
import { timeAgo } from "@/lib/format";

export function MemberProfileForm({ member }: { member: MemberRow }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const { run, pending } = useActionRunner();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: member.full_name,
      phone: member.phone ?? "",
      dateOfBirth: member.date_of_birth ?? "",
      address: member.address ?? "",
    },
  });

  async function onSubmit(values: ProfileInput) {
    setServerError(undefined);
    setSaved(false);
    const result = await run(() => updateMyProfileAction(values), {
      onSuccess: () => { setSaved(true); router.refresh(); },
    });
    if (result && !result.ok) setServerError(result.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
      {saved ? <Alert variant="success">Profile updated.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="me-name" error={form.formState.errors.fullName?.message}>
          <Input id="me-name" {...form.register("fullName")} />
        </Field>
        <Field label="Phone" htmlFor="me-phone" error={form.formState.errors.phone?.message}>
          <Input id="me-phone" autoComplete="tel" {...form.register("phone")} />
        </Field>
        <Field label="Date of birth" htmlFor="me-dob" hint="Used for age-relevant programs" error={form.formState.errors.dateOfBirth?.message}>
          <Input id="me-dob" type="date" {...form.register("dateOfBirth")} />
        </Field>
        <Field label="Address" htmlFor="me-address" error={form.formState.errors.address?.message}>
          <Input id="me-address" {...form.register("address")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save profile
        </Button>
      </div>
    </form>
  );
}

export function MemberPasswordForm() {
  const [serverError, setServerError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const { run, pending } = useActionRunner();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(undefined);
    setSaved(false);
    const result = await run(() => changeMyPasswordAction(values), {
      onSuccess: () => { setSaved(true); form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    });
    if (result && !result.ok) {
      setServerError(result.error);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) form.setError(field as keyof ChangePasswordInput, { message: messages[0] });
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
      {saved ? <Alert variant="success">Password changed. Keep it somewhere safe.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-current" error={form.formState.errors.currentPassword?.message}>
          <Input id="pw-current" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
        </Field>
        <Field label="New password" htmlFor="pw-new" error={form.formState.errors.newPassword?.message}>
          <Input id="pw-new" type="password" autoComplete="new-password" {...form.register("newPassword")} />
        </Field>
        <Field label="Confirm password" htmlFor="pw-confirm" error={form.formState.errors.confirmPassword?.message}>
          <Input id="pw-confirm" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <LockKeyhole />} Change password
        </Button>
      </div>
    </form>
  );
}

export function RenewalRequestButton({ request }: { request: RenewalRequest | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const { run, pending } = useActionRunner();

  if (request?.status === "pending") {
    return (
      <div className="rounded-[13px] border border-[#dedcfb] bg-[#f4f3ff] p-3.5">
        <p className="text-[11.5px] font-semibold text-[#4f4bc8]">Renewal request sent</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-[#6a67a5]">
          Sent {timeAgo(request.created_at)}. The team will confirm your next plan at the front desk.
        </p>
      </div>
    );
  }

  async function submit() {
    const result = await run(() => requestRenewalAction(note.trim() || undefined), {
      onSuccess: () => { setOpen(false); setNote(""); router.refresh(); },
    });
    if (!result?.ok) return;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Send /> Request renewal
      </Button>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Request a renewal</DialogTitle>
          <DialogDescription>
            Tell the gym what you would like next. They will confirm the plan and payment with you.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Field label="Note" htmlFor="renewal-note" hint="Optional">
            <Textarea
              id="renewal-note"
              placeholder="e.g. Same plan please, starting the 1st."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MemberNotificationList({ notifications }: { notifications: MemberNotification[] }) {
  const { run, pending } = useActionRunner();
  const unread = notifications.filter((item) => !item.read_at).length;
  return (
    <div className="space-y-2.5">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => markAllNotificationsReadAction())}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
      ) : null}
      {notifications.map((item) => (
        <article
          key={item.recipient_id}
          className={`rounded-[18px] border p-4 transition-colors ${item.read_at ? "border-line bg-white" : "border-[#dedcfb] bg-[#fbfaff] shadow-[var(--shadow-soft)]"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${item.read_at ? "bg-[#e0e0da]" : "accent-gradient"}`} />
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold tracking-[-0.015em]">{item.title}</h3>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-muted">{item.body}</p>
                <p className="mt-2 text-[10px] text-soft">{timeAgo(item.created_at)} · {item.kind.replaceAll("_", " ")}</p>
              </div>
            </div>
            {!item.read_at ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => markNotificationReadAction(item.recipient_id), { refresh: false })}
              >
                Mark read
              </Button>
            ) : (
              <span className="mt-1 whitespace-nowrap text-[10px] text-soft">Read</span>
            )}
          </div>
        </article>
      ))}
      {notifications.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-white p-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-[14px] border border-line bg-[#fafaf7] text-muted">
            <QrCode className="size-4" />
          </span>
          <p className="mt-3 text-[13px] font-semibold">Nothing here yet</p>
          <p className="mt-1 text-[11.5px] text-muted">Gym announcements and reminders will appear here.</p>
        </div>
      ) : null}
    </div>
  );
}
