"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRequestDemo } from "./request-demo-context";
import { RequestDemoForm } from "./request-demo-form";
import { requestDemoForm } from "@/content/landing";

export function RequestDemoDialog() {
  const { open, setOpen } = useRequestDemo();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{requestDemoForm.title}</DialogTitle>
          <DialogDescription>{requestDemoForm.description}</DialogDescription>
        </DialogHeader>
        <RequestDemoForm />
      </DialogContent>
    </Dialog>
  );
}
