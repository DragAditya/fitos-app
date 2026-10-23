"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  acceptInviteAction,
  demoLoginAction,
  forgotPasswordAction,
  loginAction,
  registerOwnerAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import { CopyField } from "@/components/forms/copy-button";

function ErrorAlert({ message }: { message?: string | null }) {
  return message ? (
    <Alert variant="danger" className="mb-5">
      {message}
    </Alert>
  ) : null;
}

function PasswordInput({ name, autoComplete = "current-password", placeholder = "Your password" }: {
  name: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1 grid size-8 place-items-center rounded-[8px] text-soft hover:bg-[#f4f4f0] hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, demoEnabled }: { next?: string; demoEnabled: boolean }) {
  const [state, formAction, pending] = React.useActionState(loginAction, null);
  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#706bd9]">
          Welcome back
        </p>
        <h1 className="text-[30px] font-semibold tracking-[-0.045em]">Sign in to FitOS</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          One calm place for your members, memberships and front desk.
        </p>
      </div>

      {state && !state.ok ? <ErrorAlert message={state.error} /> : null}

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label="Email" htmlFor="email" error={state && !state.ok ? state.fieldErrors?.email?.[0] : undefined}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@gym.com" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state && !state.ok ? state.fieldErrors?.password?.[0] : undefined}>
          <PasswordInput name="password" />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <label className="flex items-center gap-2 text-[11.5px] text-muted">
            <input type="checkbox" className="size-3.5 accent-[#5b5ce2]" defaultChecked /> Keep me signed in
          </label>
          <Link href="/forgot-password" className="text-[11.5px] font-medium text-[#5652c8] hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      {demoEnabled ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-soft">Demo workspace</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <form action={demoLoginAction}>
              <input type="hidden" name="email" value="owner@fitos.app" />
              <input type="hidden" name="password" value="FitOS2026!" />
              <Button type="submit" variant="secondary" className="w-full">
                Owner demo
              </Button>
            </form>
            <form action={demoLoginAction}>
              <input type="hidden" name="email" value="member@fitos.app" />
              <input type="hidden" name="password" value="FitOS2026!" />
              <Button type="submit" variant="secondary" className="w-full">
                Member demo
              </Button>
            </form>
          </div>
          <div className="mt-3 rounded-[12px] border border-line bg-[#fbfbf8] p-3">
            <p className="text-[10.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Owner</span> owner@fitos.app ·{" "}
              <span className="font-semibold text-ink">Member</span> member@fitos.app
              <br />
              Password for both: <span className="font-mono text-[10.5px] text-ink">FitOS2026!</span>
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-7 text-center text-[12px] text-muted">
        New gym?{" "}
        <Link href="/register" className="font-semibold text-[#4e4ac4] hover:underline">
          Create an owner account
        </Link>
      </p>
    </div>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
      {!pending ? <ArrowRight /> : null}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = React.useActionState(registerOwnerAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#706bd9]">Start your workspace</p>
        <h1 className="text-[28px] font-semibold tracking-[-0.045em]">Open your gym on FitOS</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Create the owner account, name your gym and get a starter set of plans.
        </p>
      </div>
      {state && !state.ok ? <ErrorAlert message={state.error} /> : null}
      <form action={formAction} className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="fullName" error={errors?.fullName?.[0]}>
            <Input id="fullName" name="fullName" autoComplete="name" placeholder="Aarav Mehta" required />
          </Field>
          <Field label="Gym name" htmlFor="gymName" error={errors?.gymName?.[0]}>
            <Input id="gymName" name="gymName" placeholder="Ironclad Strength Club" required />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" error={errors?.email?.[0]}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@gym.com" required />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" hint="Optional" error={errors?.phone?.[0]}>
            <Input id="phone" name="phone" autoComplete="tel" placeholder="+91 98765 43210" />
          </Field>
          <Field label="City" htmlFor="city" hint="Optional" error={errors?.city?.[0]}>
            <Input id="city" name="city" placeholder="Mumbai" />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={errors?.password?.[0]}>
            <PasswordInput name="password" autoComplete="new-password" placeholder="At least 8 characters" />
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" error={errors?.confirmPassword?.[0]}>
            <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="Repeat password" />
          </Field>
        </div>
        <p className="text-[10.5px] leading-relaxed text-soft">
          By creating a workspace you agree to keep member data accurate and use it responsibly.
          Accounts are provisioned as owners only through this trusted server flow.
        </p>
        <SubmitButton label="Create workspace" pending={pending} />
      </form>
      <p className="mt-6 text-center text-[12px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#4e4ac4] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = React.useActionState(forgotPasswordAction, null);
  const success = state?.ok ? state : null;
  return (
    <div>
      <div className="mb-7">
        <div className="mb-5 grid size-11 place-items-center rounded-[14px] border border-[#dedcfb] bg-[#f3f2ff] text-[#5551d4]">
          <Mail className="size-5" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">Reset your password</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Enter the email linked to your FitOS account. We will create a one-hour reset link.
        </p>
      </div>
      {state && !state.ok ? <ErrorAlert message={state.error} /> : null}
      {success ? (
        <div className="space-y-4">
          <Alert variant="success" title="Request received">
            {success.message}
          </Alert>
          {success.data.resetUrl ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted">Development reset link</p>
              <CopyField value={success.data.resetUrl} />
              <Button asChild variant="secondary" className="w-full">
                <Link href={success.data.resetUrl}>Open reset link</Link>
              </Button>
            </div>
          ) : (
            <Alert variant="warning">
              No email provider is configured in this deployment. The gym owner can reset access
              from the server, or enable <code className="font-mono text-[10px]">FITOS_SHOW_RESET_LINK</code>.
            </Alert>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <Field label="Email" htmlFor="email" error={state && !state.ok ? state.fieldErrors?.email?.[0] : undefined}>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@gym.com" required />
          </Field>
          <SubmitButton label="Send reset link" pending={pending} />
        </form>
      )}
      {!success ? (
        <p className="mt-6 text-center text-[12px] text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-[#4e4ac4] hover:underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = React.useActionState(resetPasswordAction, null);
  if (state?.ok) {
    return (
      <div>
        <div className="mb-5 grid size-11 place-items-center rounded-[14px] border border-[#cfeade] bg-[#edf9f2] text-positive">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">Password updated</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{state.message}</p>
        <Button asChild variant="gradient" size="lg" className="mt-6 w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[27px] font-semibold tracking-[-0.04em]">Choose a new password</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Use at least 8 characters with one letter and one number.
        </p>
      </div>
      {state && !state.ok ? <ErrorAlert message={state.error} /> : null}
      <form action={formAction} className="space-y-3.5">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" htmlFor="password" error={state && !state.ok ? state.fieldErrors?.password?.[0] : undefined}>
          <PasswordInput name="password" autoComplete="new-password" placeholder="New password" />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={state && !state.ok ? state.fieldErrors?.confirmPassword?.[0] : undefined}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="Repeat password" />
        </Field>
        <SubmitButton label="Update password" pending={pending} />
      </form>
    </div>
  );
}

export function JoinForm({
  token,
  gymName,
  email,
  suggestedName,
}: {
  token: string;
  gymName: string;
  email: string;
  suggestedName: string;
}) {
  const [state, formAction, pending] = React.useActionState(acceptInviteAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#706bd9]">You’re invited</p>
        <h1 className="text-[28px] font-semibold tracking-[-0.045em]">Join {gymName}</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Activate your member account for <span className="font-medium text-ink">{email}</span>. This
          invitation is single-use and expires after seven days.
        </p>
      </div>
      {state && !state.ok ? <ErrorAlert message={state.error} /> : null}
      <form action={formAction} className="space-y-3.5">
        <input type="hidden" name="token" value={token} />
        <Field label="Your name" htmlFor="fullName" error={errors?.fullName?.[0]}>
          <Input id="fullName" name="fullName" defaultValue={suggestedName} autoComplete="name" required />
        </Field>
        <Field label="Phone" htmlFor="phone" hint="Optional" error={errors?.phone?.[0]}>
          <Input id="phone" name="phone" autoComplete="tel" placeholder="+91 98765 43210" />
        </Field>
        <Field label="Create password" htmlFor="password" error={errors?.password?.[0]}>
          <PasswordInput name="password" autoComplete="new-password" placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors?.confirmPassword?.[0]}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="Repeat password" />
        </Field>
        <SubmitButton label="Activate membership" pending={pending} />
      </form>
    </div>
  );
}
