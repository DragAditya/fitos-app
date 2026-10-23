import { PageTransition } from "@/components/page-transition";

export default function OwnerTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
