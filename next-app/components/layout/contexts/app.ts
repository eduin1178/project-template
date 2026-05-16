import { createElement } from "react";
import {
  HouseIcon,
  ListChecksIcon,
  ShieldStarIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export const appSidebarConfig: SidebarConfig = {
  brand: {
    label: "Docentix",
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
    {
      label: "Tareas",
      href: "/tasks",
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

export function buildAppSidebarConfig(slug: string): SidebarConfig {
  return {
    brand: {
      label: "Docentix",
      description: "Mi espacio",
      href: `/${slug}`,
      icon: createElement(HouseIcon, { weight: "fill" }),
    },
    items: [
      {
        label: "Inicio",
        href: `/${slug}`,
        icon: createElement(HouseIcon),
      },
      {
        label: "Tareas",
        href: `/${slug}/tasks`,
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
}
