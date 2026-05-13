import { createElement } from "react";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const adminSidebarConfig: SidebarConfig = {
  brand: {
    label: "Edunet",
    description: "Panel admin",
    href: "/admin",
    icon: createElement(HouseIcon, { weight: "fill" }),
  },
  items: [
    {
      label: "Inicio",
      href: "/admin",
      icon: createElement(HouseIcon),
    },
  ],
};
