import type { ReactNode } from "react";
import { ViewTransition } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="page">
      <div className="page-transition">{children}</div>
    </ViewTransition>
  );
}
