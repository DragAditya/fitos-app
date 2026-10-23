import { PageTransition } from "@/components/page-transition";

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
