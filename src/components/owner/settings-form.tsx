"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Globe2,
  ImageIcon,
  MapPin,
  ReceiptText,
  RotateCcw,
  Save,
  ScanLine,
  Sparkles,
  Tag,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import { gymSettingsSchema, type GymSettingsInput } from "@/lib/validation";
import type { Gym } from "@/server/db/types";
import { updateGymSettingsAction } from "@/server/actions/settings";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GymLogo } from "@/components/owner/gym-logo";
import { SettingsSection } from "@/components/owner/settings-section";
import { useActionRunner } from "@/components/forms/use-action-runner";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const REMINDER_WINDOWS = [1, 3, 5, 7, 14, 30];

function currencyPreview(currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(2499);
  } catch {
    return "—";
  }
}

export function GymSettingsForm({ gym }: { gym: Gym }) {
  const [serverError, setServerError] = React.useState<string>();
  const [now, setNow] = React.useState<Date | null>(null);
  const { run, pending } = useActionRunner();

  const defaults: GymSettingsInput = React.useMemo(
    () => ({
      name: gym.name,
      phone: gym.phone ?? "",
      email: gym.email ?? "",
      address: gym.address ?? "",
      city: gym.city ?? "",
      timezone: gym.timezone,
      currency: gym.currency as GymSettingsInput["currency"],
      logoUrl: gym.logo_url ?? "",
      memberCodePrefix: gym.member_code_prefix ?? "IC",
      memberCheckinEnabled: gym.member_checkin_enabled !== false,
      reminderDays: gym.reminder_days ?? 7,
      receiptFooter: gym.receipt_footer ?? "",
    }),
    [gym],
  );

  const form = useForm<GymSettingsInput>({
    resolver: zodResolver(gymSettingsSchema),
    defaultValues: defaults,
  });

  const values = useWatch({ control: form.control });
  const gymName = values.name ?? defaults.name;
  const city = values.city ?? defaults.city;
  const phone = values.phone ?? defaults.phone;
  const email = values.email ?? defaults.email;
  const logoUrl = values.logoUrl ?? defaults.logoUrl;
  const memberCodePrefix = (values.memberCodePrefix ?? defaults.memberCodePrefix).toUpperCase();
  const timezone = values.timezone ?? defaults.timezone;
  const currency = values.currency ?? defaults.currency;
  const receiptFooter = values.receiptFooter ?? defaults.receiptFooter ?? "";
  const reminderDays = values.reminderDays ?? defaults.reminderDays;

  React.useEffect(() => {
    const tick = () => setNow(new Date());
    const frame = window.requestAnimationFrame(tick);
    const timer = window.setInterval(tick, 30_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const localTime = React.useMemo(() => {
    if (!now) return "Live time";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);
    } catch {
      return "Live time";
    }
  }, [now, timezone]);

  async function onSubmit(submitted: GymSettingsInput) {
    setServerError(undefined);
    const result = await run(() => updateGymSettingsAction(submitted), {
      onSuccess: () => {
        form.reset(submitted);
      },
    });
    if (result && !result.ok) setServerError(result.error);
  }

  function discard() {
    form.reset(defaults);
    setServerError(undefined);
  }

  const isDirty = form.formState.isDirty;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert variant="danger">{serverError}</Alert> : null}

      <SettingsSection
        id="profile"
        index="01 · Identity"
        icon={Building2}
        title="Gym profile"
        description="The name, contact details and mark members see across their experience and receipts."
        headerAction={
          <span className="hidden items-center gap-1.5 rounded-full border border-[#cfeade] bg-[#f2fbf6] px-2.5 py-1 text-[9.5px] font-medium text-[#196a4e] sm:inline-flex">
            <CheckCircle2 className="size-3" /> Public identity
          </span>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_276px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" htmlFor="gym-name" error={form.formState.errors.name?.message}>
              <Input id="gym-name" autoComplete="organization" {...form.register("name")} />
            </Field>
            <Field label="City" htmlFor="gym-city" error={form.formState.errors.city?.message}>
              <Input id="gym-city" autoComplete="address-level2" {...form.register("city")} />
            </Field>
            <Field label="Phone" htmlFor="gym-phone" error={form.formState.errors.phone?.message}>
              <Input id="gym-phone" autoComplete="tel" placeholder="+91 98765 43210" {...form.register("phone")} />
            </Field>
            <Field label="Email" htmlFor="gym-email" error={form.formState.errors.email?.message}>
              <Input id="gym-email" type="email" autoComplete="email" {...form.register("email")} />
            </Field>
            <Field
              label="Logo URL"
              htmlFor="gym-logo"
              hint="HTTPS image"
              error={form.formState.errors.logoUrl?.message}
              className="sm:col-span-2"
            >
              <div className="relative">
                <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
                <Input
                  id="gym-logo"
                  type="url"
                  placeholder="https://yourgym.com/logo.png"
                  className="pl-9"
                  {...form.register("logoUrl")}
                />
              </div>
            </Field>
            <Field
              label="Address"
              htmlFor="gym-address"
              error={form.formState.errors.address?.message}
              className="sm:col-span-2"
            >
              <Input
                id="gym-address"
                autoComplete="street-address"
                placeholder="Street, building, floor"
                {...form.register("address")}
              />
            </Field>
          </div>

          <div className="relative overflow-hidden rounded-[18px] border border-line bg-[linear-gradient(155deg,#fbfbf8_0%,#f4f3ee_100%)] p-4">
            <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-[#625df1]/10 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.17em] text-soft">Live preview</p>
              <Sparkles className="size-3.5 text-[#7772d8]" />
            </div>
            <div className="relative mt-3 rounded-[15px] border border-line bg-white p-3.5 shadow-[0_10px_30px_-22px_rgba(18,18,22,.4)]">
              <div className="flex items-center gap-2.5">
                <GymLogo name={gymName || "Your gym"} logoUrl={logoUrl} className="size-9 rounded-[10px] text-[11px]" />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold tracking-[-0.02em]">{gymName || "Your gym"}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[9.5px] text-muted">
                    <MapPin className="size-2.5" /> {city || "Add a city"}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-line pt-2.5 text-[9.5px] text-muted">
                <p className="truncate">{phone || "Add a phone number"}</p>
                <p className="truncate">{email || "Add a contact email"}</p>
              </div>
            </div>
            <p className="relative mt-3 text-[9.5px] leading-relaxed text-soft">
              Used in your owner workspace, receipts and member-facing surfaces. Leave the logo empty to use your
              initials.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="regional"
        index="02 · Regional"
        icon={Globe2}
        title="Regional settings"
        description="Control the calendar day, live time and currency formatting used by this workspace."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Timezone"
            htmlFor="gym-timezone"
            hint={localTime}
            error={form.formState.errors.timezone?.message}
          >
            <NativeSelect id="gym-timezone" {...form.register("timezone")}>
              {TIMEZONES.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Currency"
            htmlFor="gym-currency"
            hint={`e.g. ${currencyPreview(currency)}`}
            error={form.formState.errors.currency?.message}
          >
            <NativeSelect id="gym-currency" {...form.register("currency")}>
              <option value="INR">INR · Indian rupee</option>
              <option value="USD">USD · US dollar</option>
              <option value="GBP">GBP · Pound sterling</option>
              <option value="AED">AED · UAE dirham</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-[14px] border border-line bg-[#fbfbf8] px-3.5 py-3">
            <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-white text-[#5551d4]">
              <Clock3 className="size-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-medium text-soft">Gym local time</p>
              <p className="mt-0.5 text-[11.5px] font-medium">{localTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[14px] border border-line bg-[#fbfbf8] px-3.5 py-3">
            <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-white text-[#16805d]">
              <Wallet className="size-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-medium text-soft">Plan price preview</p>
              <p className="mt-0.5 text-[11.5px] font-medium">{currencyPreview(currency)}</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-soft">
          Timezone changes apply to new attendance days, reports and reminders. Stored amounts are never converted.
        </p>
      </SettingsSection>

      <SettingsSection
        id="checkin"
        index="03 · Access"
        icon={ScanLine}
        title="Check-in rules"
        description="Choose how members enter, how their IDs are generated and when expiry reminders are prepared."
      >
        <Controller
          control={form.control}
          name="memberCheckinEnabled"
          render={({ field }) => (
            <div
              className={cn(
                "flex flex-col gap-4 rounded-[18px] border p-4 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between",
                field.value
                  ? "border-[#d7ecdf] bg-[linear-gradient(135deg,#fbfefc_0%,#f2fbf6_100%)]"
                  : "border-[#efe3cf] bg-[linear-gradient(135deg,#fffdf8_0%,#fff9ef_100%)]",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-[11px] border transition-colors",
                    field.value
                      ? "border-[#cfeade] bg-white text-[#16805d]"
                      : "border-[#efe1c9] bg-white text-[#9a6a13]",
                  )}
                >
                  <UserRoundCheck className="size-4" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-semibold tracking-[-0.01em]">Member self check-in</p>
                    <Badge variant={field.value ? "active" : "expiring"} size="sm">
                      {field.value ? "Live" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-[470px] text-[10.5px] leading-relaxed text-muted">
                    When paused, members see a clear notice and only the front desk can record a visit. Manual
                    check-in always remains available.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <span className="text-[9.5px] font-medium text-soft">{field.value ? "Accepting visits" : "Paused"}</span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Allow member self check-in"
                />
              </div>
            </div>
          )}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Member ID prefix"
            htmlFor="member-code-prefix"
            hint={`${memberCodePrefix || "IC"}-0001`}
            error={form.formState.errors.memberCodePrefix?.message}
          >
            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
              <Controller
                control={form.control}
                name="memberCodePrefix"
                render={({ field }) => (
                  <Input
                    id="member-code-prefix"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    onBlur={field.onBlur}
                    name={field.name}
                    maxLength={4}
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="pl-9 font-mono uppercase tracking-[0.08em]"
                  />
                )}
              />
            </div>
          </Field>
          <Field
            label="Expiry reminder window"
            htmlFor="reminder-days"
            hint={`${reminderDays} day${Number(reminderDays) === 1 ? "" : "s"}`}
            error={form.formState.errors.reminderDays?.message}
          >
            <NativeSelect
              id="reminder-days"
              {...form.register("reminderDays", { valueAsNumber: true })}
            >
              {REMINDER_WINDOWS.map((days) => (
                <option key={days} value={days}>
                  {days} day{days === 1 ? "" : "s"}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-[13px] border border-line bg-[#fbfbf8] px-3.5 py-3 text-[10px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            New members use the prefix automatically. Existing member codes never change.
          </span>
          <span className="font-mono text-[9.5px] text-soft">
            {memberCodePrefix || "IC"}-{String(42).padStart(4, "0")}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection
        id="receipts"
        index="04 · Receipts"
        icon={ReceiptText}
        title="Receipts & notes"
        description="Add a personal sign-off to every payment receipt while keeping the manual-entry disclosure intact."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_286px]">
          <div>
            <Field
              label="Receipt footer note"
              htmlFor="receipt-footer"
              hint={`${receiptFooter.length}/280`}
              error={form.formState.errors.receiptFooter?.message}
            >
              <Textarea
                id="receipt-footer"
                maxLength={280}
                rows={5}
                placeholder="Thank you for training with us. Questions about this payment? Reply to the front desk and we'll help."
                {...form.register("receiptFooter")}
              />
            </Field>
            <p className="mt-2 text-[10px] leading-relaxed text-soft">
              Your note appears above FitOS&apos;s manual-entry disclosure. Leave it empty to use the standard receipt
              footer only.
            </p>
          </div>

          <div className="rounded-[18px] border border-line bg-[#fbfbf8] p-4">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.17em] text-soft">Receipt preview</p>
            <div className="mt-3 rounded-[14px] border border-line bg-white p-3.5 shadow-[0_10px_26px_-22px_rgba(18,18,22,.35)]">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <GymLogo name={gymName || "Your gym"} logoUrl={logoUrl} className="size-7 rounded-[8px] text-[9px]" />
                  <p className="truncate text-[10.5px] font-semibold">{gymName || "Your gym"}</p>
                </div>
                <span className="font-mono text-[9px] text-soft">#0042</span>
              </div>
              <div className="flex items-center justify-between py-3 text-[10px]">
                <span className="text-muted">Membership payment</span>
                <span className="font-semibold tabular">{formatMoney(249900, currency)}</span>
              </div>
              {receiptFooter.trim() ? (
                <p className="whitespace-pre-line rounded-[9px] bg-[#fafaf7] px-2.5 py-2 text-[9px] leading-relaxed text-muted">
                  {receiptFooter}
                </p>
              ) : (
                <p className="rounded-[9px] border border-dashed border-line px-2.5 py-2 text-[9px] leading-relaxed text-soft">
                  Your note will appear here.
                </p>
              )}
              <p className="mt-2 text-[8px] leading-relaxed text-soft">
                Manual entry · gateway_verified: false
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              isDirty ? "bg-[#d18a19]" : "bg-[#1c956d]",
            )}
          />
          {isDirty ? "You have unsaved workspace changes." : "Workspace settings are up to date."}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={discard} disabled={!isDirty || pending}>
            <RotateCcw /> Discard
          </Button>
          <Button type="submit" variant="gradient" disabled={pending}>
            <Save /> {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {isDirty ? (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[560px] items-center gap-3 rounded-[16px] border border-[#2b2b33] bg-[#151519]/95 p-2.5 pl-4 text-white shadow-[0_24px_60px_-20px_rgba(18,18,22,.55)] backdrop-blur-xl animate-slide-up">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f0b35a] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#f0b35a]" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-white/65">
            Unsaved changes · review before you leave
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={discard}
            disabled={pending}
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            Discard
          </Button>
          <Button type="submit" variant="gradient" size="sm" disabled={pending}>
            <Save /> {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
