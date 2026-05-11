"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useRequestDemo } from "./request-demo-context";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  label?: string;
};

export function RequestDemoButton({
  label = "Solicitar demo",
  variant = "default",
  size = "default",
  className,
  ...rest
}: Props) {
  const { openDemo } = useRequestDemo();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={openDemo}
      className={cn(className)}
      {...rest}
    >
      {label}
    </Button>
  );
}
