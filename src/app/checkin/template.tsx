import { PageTransition } from "@/components/page-transition";

export default function CheckInTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
