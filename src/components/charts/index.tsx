"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#5b5ce2", "#8c6cf0", "#21a37a", "#e2a03f", "#e2685a", "#7c8798"];

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-[var(--shadow-lift)]">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-soft">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <span className="size-1.5 rounded-full" style={{ background: item.color }} />
          {item.name ? <span className="text-muted">{item.name}</span> : null}
          <span className="tabular">
            {money ? formatMoney(Number(item.value ?? 0)) : formatNumber(Number(item.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  );
}

export function AreaTrendChart({
  data,
  height = 250,
  color = "#5b5ce2",
  name = "Check-ins",
  ariaLabel = "Trend chart",
  className,
}: {
  data: Array<{ label: string; value: number; date?: string }>;
  height?: number;
  color?: string;
  name?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const id = React.useId().replaceAll(":", "");
  return (
    <div className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="70%" stopColor={color} stopOpacity={0.05} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ecece7" strokeDasharray="2 5" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#8a8a92" }}
            minTickGap={22}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#a0a0a8" }}
            allowDecimals={false}
            width={42}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d8d7f6", strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2}
            fill={`url(#area-${id})`}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueBarChart({
  data,
  height = 250,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
}) {
  const id = React.useId().replaceAll(":", "");
  return (
    <div className={cn("w-full", className)} role="img" aria-label="Revenue by day">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 12, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b5ce2" />
              <stop offset="100%" stopColor="#8e73f2" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ecece7" strokeDasharray="2 5" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#8a8a92" }}
            minTickGap={20}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#a0a0a8" }}
            tickFormatter={(value) => `₹${Math.round(Number(value) / 100000)}k`}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip money />}
            cursor={{ fill: "rgba(91,92,226,.04)" }}
          />
          <Bar dataKey="value" name="Revenue" fill={`url(#bar-${id})`} radius={[5, 5, 2, 2]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  total,
  totalLabel = "Total",
  height = 210,
  className,
}: {
  data: Array<{ name: string; count: number }>;
  total?: number;
  totalLabel?: string;
  height?: number;
  className?: string;
}) {
  const sum = total ?? data.reduce((acc, item) => acc + item.count, 0);
  return (
    <div className={cn("w-full", className)} role="img" aria-label="Plan distribution">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[25px] font-semibold leading-none tracking-[-0.04em] tabular">{sum}</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-soft">
            {totalLabel}
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="tabular font-medium text-ink">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SparkBars({
  data,
  className,
}: {
  data: Array<{ label: string; value: number; visited?: boolean }>;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className={cn("flex items-end justify-between gap-2", className)}>
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className={cn(
              "w-full rounded-[6px] transition-colors",
              item.visited ? "accent-gradient" : "bg-[#ecece7]",
            )}
            style={{ height: `${Math.max(6, (item.value / max) * 62)}px` }}
            title={`${item.label}: ${item.value > 0 ? "checked in" : "no visit"}`}
          />
          <span className={cn("text-[9.5px]", item.visited ? "font-semibold text-ink" : "text-soft")}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
