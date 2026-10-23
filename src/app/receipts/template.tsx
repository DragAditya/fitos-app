import { PageTransition } from "@/components/page-transition";

export default function ReceiptTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
