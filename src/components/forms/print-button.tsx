"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()} className="print:hidden">
      <Printer /> Print receipt
    </Button>
  );
}
