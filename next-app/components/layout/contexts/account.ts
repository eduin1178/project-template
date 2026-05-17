import { createElement } from "react";
import { UserIcon } from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export function buildAccountFallbackSidebarConfig(): SidebarConfig {
  return {
    brand: {
      label: "Docentix",
      description: "Mi cuenta",
      href: "/account/profile",
      icon: createElement(UserIcon, { weight: "fill" }),
    },
    items: [],
  };
}
