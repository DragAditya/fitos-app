import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FitOS — Manage. Track. Grow.",
    template: "%s · FitOS",
  },
  description:
    "FitOS is the fitness operating system for independent gyms. Members, memberships, attendance, payments and reports in one calm place.",
  applicationName: "FitOS",
  authors: [{ name: "FitOS" }],
};

export const viewport: Viewport = {
  themeColor: "#f6f6f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              borderRadius: "14px",
              border: "1px solid #e7e6e1",
              boxShadow: "0 24px 60px -28px rgba(18,18,22,.22)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
