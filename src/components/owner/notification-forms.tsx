"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BellRing, Loader2, Megaphone, Send, Wallet } from "lucide-react";
import { announcementSchema, type AnnouncementInput } from "@/lib/validation";
import {
  createAnnouncementAction,
  sendExpiryRemindersAction,
  sendPaymentRemindersAction,
} from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { useActionRunner } from "@/components/forms/use-action-runner";

type AnnouncementFormValues = z.input<typeof announcementSchema>;

export function AnnouncementDialog({
  members,
  kind = "announcement",
  label = "New notification",
}: {
  members: Array<{ id: string; full_name: string; member_code: string }>;
  kind?: "announcement" | "expiry" | "payment" | "system";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string>();
  const { run, pending } = useActionRunner();
  const form = useForm<AnnouncementFormValues, unknown, AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", kind, audience: "all", memberIds: [] },
  });
  const audience = form.watch("audience");

  async function onSubmit(values: AnnouncementInput) {
    setServerError(undefined);
    const result = await run(() => createAnnouncementAction(values), {
      onSuccess: () => {
        setOpen(false);
        form.reset({ title: "", body: "", kind, audience: "all", memberIds: [] });
      },
    });
    if (result && !result.ok) {
      setServerError(result.error);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) form.setError(field as keyof AnnouncementFormValues, { message: messages[0] });
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Megaphone /> {label}
      </Button>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Send an in-app notification</DialogTitle>
          <DialogDescription>
            Notifications are persisted and shown in each recipient’s member inbox. No email or SMS is sent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-3.5">
            {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
            <div className="grid gap-3.5 sm:grid-cols-[1fr_170px]">
              <Field label="Title" htmlFor="notice-title" error={form.formState.errors.title?.message}>
                <Input id="notice-title" placeholder="A short, useful headline" {...form.register("title")} />
              </Field>
              <Field label="Type" htmlFor="notice-kind" error={form.formState.errors.kind?.message}>
                <NativeSelect id="notice-kind" {...form.register("kind")}>
                  <option value="announcement">Announcement</option>
                  <option value="system">System</option>
                  <option value="expiry">Membership</option>
                  <option value="payment">Payment</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Message" htmlFor="notice-body" error={form.formState.errors.body?.message}>
              <Textarea id="notice-body" className="min-h-[110px]" placeholder="What should members know?" {...form.register("body")} />
            </Field>
            <Field label="Audience" htmlFor="notice-audience">
              <NativeSelect id="notice-audience" {...form.register("audience")}>
                <option value="all">All members</option>
                <option value="selected">Selected members</option>
              </NativeSelect>
            </Field>
            {audience === "selected" ? (
              <div>
                <p className="mb-2 text-[11.5px] font-medium text-muted">Choose recipients</p>
                <div className="max-h-[190px] space-y-1 overflow-y-auto rounded-[12px] border border-line p-2">
                  {members.map((member) => (
                    <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12px] hover:bg-[#f8f8f5]">
                      <input type="checkbox" value={member.id} className="size-3.5 accent-[#5b5ce2]" {...form.register("memberIds")} />
                      <span className="flex-1">{member.full_name}</span>
                      <span className="font-mono text-[9px] text-soft">{member.member_code}</span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.memberIds ? (
                  <p className="mt-1 text-[11px] text-danger">{form.formState.errors.memberIds.message}</p>
                ) : null}
              </div>
            ) : null}
            <p className="rounded-[11px] border border-line bg-[#fbfbf8] p-3 text-[10.5px] leading-relaxed text-muted">
              Delivery is in-app only. Recipients can mark notifications read; delivery counts are visible in the log.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />} Send notification
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReminderActions() {
  const { run, pending } = useActionRunner();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => sendExpiryRemindersAction())}>
        {pending ? <Loader2 className="animate-spin" /> : <BellRing />} Expiry reminders
      </Button>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => sendPaymentRemindersAction())}>
        {pending ? <Loader2 className="animate-spin" /> : <Wallet />} Payment reminders
      </Button>
    </div>
  );
}
