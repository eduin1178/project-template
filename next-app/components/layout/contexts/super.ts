import { createElement } from "react";
import {
  ArrowUUpLeftIcon,
  BuildingsIcon,
  ShieldStarIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const superSidebarConfig: SidebarConfig = {
  brand: {
    label: "Docentix",
    description: "Plataforma",
    href: "/super",
    icon: createElement(ShieldStarIcon, { weight: "fill" }),
  },
  items: [
    {
      label: "Instituciones",
      href: "/super/organizations",
      icon: createElement(BuildingsIcon),
      matchPrefix: "/super/organizations",
    },
    {
      label: "Volver a mi institución",
      href: "/post-login",
      icon: createElement(ArrowUUpLeftIcon),
    },
  ],
};
