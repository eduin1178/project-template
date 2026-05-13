import { createElement } from "react";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const appSidebarConfig: SidebarConfig = {
  brand: {
    label: "Edunet",
    description: "Mi espacio",
    href: "/app",
    icon: createElement(HouseIcon, { weight: "fill" }),
  },
  items: [
    {
      label: "Inicio",
      href: "/app",
      icon: createElement(HouseIcon),
    },
  ],
};
