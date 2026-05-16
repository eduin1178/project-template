import { createElement } from "react";
import {
  HouseIcon,
  ListChecksIcon,
  ShieldStarIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const adminSidebarConfig: SidebarConfig = {
  brand: {
    label: "Docentix",
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
    {
      label: "Tareas",
      href: "/admin/tasks",
      icon: createElement(ListChecksIcon),
    },
    {
      label: "Panel de plataforma",
      href: "/super",
      icon: createElement(ShieldStarIcon),
      requiresRole: "super_admin",
    },
  ],
};
