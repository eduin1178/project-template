import { createElement } from "react";
import { BuildingsIcon, ShieldStarIcon } from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const superSidebarConfig: SidebarConfig = {
  brand: {
    label: "Edunet",
    description: "Panel super",
    href: "/super",
    icon: createElement(ShieldStarIcon, { weight: "fill" }),
  },
  items: [
    {
      label: "Organizaciones",
      href: "/super/organizations",
      icon: createElement(BuildingsIcon),
      matchPrefix: "/super/organizations",
    },
  ],
};
