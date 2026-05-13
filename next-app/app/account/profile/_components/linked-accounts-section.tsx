"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth/client";

import { unlinkAccountAction } from "../actions";

type LinkedAccount = {
  providerId: string;
  accountId: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  credential: "Email y contraseña",
};

function labelFor(providerId: string) {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

export function LinkedAccountsSection({
  accounts,
  hasGoogle,
  totalMethods,
}: {
  accounts: LinkedAccount[];
  hasGoogle: boolean;
  totalMethods: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onLinkGoogle() {
    setError(null);
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "/account/profile",
    });
  }

  function onUnlink(account: LinkedAccount) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkAccountAction({
        providerId: account.providerId,
        accountId: account.accountId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Cuenta desvinculada.");
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ul className="divide-border divide-y rounded-md border">
        {accounts.length === 0 ? (
          <li className="text-muted-foreground p-4 text-sm">
            No tienes proveedores vinculados.
          </li>
        ) : (
          accounts.map((account) => {
            const isOnlyMethod = totalMethods <= 1;
            return (
              <li
                key={`${account.providerId}:${account.accountId}`}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {labelFor(account.providerId)}
                  </span>
                  {account.providerId === "google" ? (
                    <a
                      href="https://myaccount.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                    >
                      Gestionar cuenta
                      <ArrowSquareOutIcon className="size-3" />
                    </a>
                  ) : null}
                </div>
                {isOnlyMethod ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button variant="outline" size="sm" disabled>
                          Desvincular
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Es tu único método de acceso.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => onUnlink(account)}
                  >
                    Desvincular
                  </Button>
                )}
              </li>
            );
          })
        )}
      </ul>

      {!hasGoogle ? (
        <Button variant="outline" onClick={onLinkGoogle}>
          Vincular Google
        </Button>
      ) : null}
    </div>
  );
}
