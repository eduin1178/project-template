"use client";

import * as React from "react";

type RequestDemoContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openDemo: () => void;
};

const RequestDemoContext = React.createContext<RequestDemoContextValue | null>(
  null
);

export function RequestDemoProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openDemo = React.useCallback(() => setOpen(true), []);

  return (
    <RequestDemoContext.Provider value={{ open, setOpen, openDemo }}>
      {children}
    </RequestDemoContext.Provider>
  );
}

export function useRequestDemo() {
  const ctx = React.useContext(RequestDemoContext);
  if (!ctx) {
    throw new Error(
      "useRequestDemo must be used inside <RequestDemoProvider>."
    );
  }
  return ctx;
}
