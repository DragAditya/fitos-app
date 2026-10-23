import { PageTransition } from "@/components/page-transition";

export default function MemberTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
