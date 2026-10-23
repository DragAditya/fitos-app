"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  changePasswordSchema,
  ownerProfileSchema,
  type ChangePasswordInput,
  type OwnerProfileInput,
} from "@/lib/validation";
import {
  changeOwnerPasswordAction,
  signOutOtherSessionsAction,
  updateOwnerProfileAction,
} from "@/server/actions/settings";
import { logoutAction } from "@/server/actions/auth";
import { useActionRunner } from "@/components/forms/use-action-runner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/owner/settings-section";
import { cn } from "@/lib/utils";

function SecretInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[7px] text-soft transition-colors hover:bg-[#f4f4f0] hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

export function AccountSettings({
  profile,
  sessionCount,
}: {
  profile: {
    fullName: string;
    email: string;
    phone: string | null;
    memberSince: string;
  };
  sessionCount: number;
}) {
  const [profileError, setProfileError] = React.useState<string>();
  const [passwordError, setPasswordError] = React.useState<string>();
  const [sessionError, setSessionError] = React.useState<string>();
  const profileRunner = useActionRunner();
  const passwordRunner = useActionRunner();
  const sessionRunner = useActionRunner();

  const profileForm = useForm<OwnerProfileInput>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: {
      fullName: profile.fullName,
      phone: profile.phone ?? "",
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function saveProfile(values: OwnerProfileInput) {
    setProfileError(undefined);
    const result = await profileRunner.run(() => updateOwnerProfileAction(values), {
      onSuccess: () => profileForm.reset(values),
    });
    if (result && !result.ok) setProfileError(result.error);
  }

  async function savePassword(values: ChangePasswordInput) {
    setPasswordError(undefined);
    const result = await passwordRunner.run(() => changeOwnerPasswordAction(values), {
      onSuccess: () => passwordForm.reset(),
    });
    if (result && !result.ok) setPasswordError(result.error);
  }

  async function signOutOthers() {
    setSessionError(undefined);
    const result = await sessionRunner.run(() => signOutOtherSessionsAction());
    if (result && !result.ok) setSessionError(result.error);
  }

  return (
    <SettingsSection
      id="account"
      index="05 · Security"
      icon={ShieldCheck}
      title="Owner account"
      description="Your identity, sign-in security and the devices that can reach this workspace."
      headerAction={
        <span className="hidden items-center gap-1.5 rounded-full border border-[#dedcfb] bg-[#f4f3ff] px-2.5 py-1 text-[9.5px] font-medium text-[#5551d4] sm:inline-flex">
          <LockKeyhole className="size-3" /> Owner only
        </span>
      }
    >
      <div className="flex flex-col gap-4 rounded-[18px] border border-line bg-[linear-gradient(150deg,#fbfbf8_0%,#f6f5ef_100%)] p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={profile.fullName} size="lg" ring />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold tracking-[-0.02em]">{profile.fullName}</p>
            <p className="truncate text-[10.5px] text-muted">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="dark" size="sm">Owner</Badge>
              <Badge variant="outline" size="sm">Since {profile.memberSince}</Badge>
            </div>
          </div>
        </div>
        <div className="sm:ml-auto">
          <p className="flex items-center gap-1.5 text-[10px] text-muted">
            <ShieldCheck className="size-3 text-[#16805d]" />
            Owner access is assigned by trusted server flows only.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-3" noValidate>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold">Profile details</p>
              <p className="mt-0.5 text-[10px] text-muted">Shown in the workspace and audit trail.</p>
            </div>
            <Badge variant="outline" size="sm">Editable</Badge>
          </div>
          {profileError ? <Alert variant="danger">{profileError}</Alert> : null}
          <Field label="Full name" htmlFor="owner-name" error={profileForm.formState.errors.fullName?.message}>
            <Input id="owner-name" autoComplete="name" {...profileForm.register("fullName")} />
          </Field>
          <Field label="Phone" htmlFor="owner-phone" error={profileForm.formState.errors.phone?.message}>
            <Input id="owner-phone" autoComplete="tel" {...profileForm.register("phone")} />
          </Field>
          <Field label="Sign-in email" htmlFor="owner-email">
            <Input id="owner-email" value={profile.email} disabled readOnly />
          </Field>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="secondary" size="sm" disabled={profileRunner.pending}>
              <Save /> {profileRunner.pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>

        <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-3 border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0" noValidate>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold">Password</p>
              <p className="mt-0.5 text-[10px] text-muted">At least 8 characters with a letter and number.</p>
            </div>
            <span className="grid size-7 place-items-center rounded-[8px] border border-line bg-[#fbfbf8] text-muted">
              <KeyRound className="size-3.5" />
            </span>
          </div>
          {passwordError ? <Alert variant="danger">{passwordError}</Alert> : null}
          <Field
            label="Current password"
            htmlFor="owner-current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
          >
            <SecretInput
              id="owner-current-password"
              autoComplete="current-password"
              {...passwordForm.register("currentPassword")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Field
              label="New password"
              htmlFor="owner-new-password"
              error={passwordForm.formState.errors.newPassword?.message}
            >
              <SecretInput
                id="owner-new-password"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
              />
            </Field>
            <Field
              label="Confirm password"
              htmlFor="owner-confirm-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
            >
              <SecretInput
                id="owner-confirm-password"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
              />
            </Field>
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="secondary" size="sm" disabled={passwordRunner.pending}>
              <KeyRound /> {passwordRunner.pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-5 rounded-[18px] border border-line bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fbfbf8] text-[#5551d4]">
              <MonitorSmartphone className="size-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12.5px] font-semibold">Active sessions</p>
                <Badge variant={sessionCount > 1 ? "pending" : "active"} size="sm">
                  {sessionCount} {sessionCount === 1 ? "device" : "devices"}
                </Badge>
              </div>
              <p className="mt-1 max-w-[520px] text-[10.5px] leading-relaxed text-muted">
                Sessions are database-backed and expire after 30 days. Signing out other devices keeps this browser
                signed in.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void signOutOthers()}
            disabled={sessionRunner.pending || sessionCount <= 1}
          >
            <MonitorSmartphone />
            {sessionRunner.pending ? "Signing out…" : "Sign out other devices"}
          </Button>
        </div>
        {sessionError ? <Alert variant="danger" className="mt-3">{sessionError}</Alert> : null}
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-relaxed text-muted">
            Done for now? Sign out of this browser as well.
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outlineDanger" size="sm">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </div>
    </SettingsSection>
  );
}
