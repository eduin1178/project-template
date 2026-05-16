import { createElement } from "react";
import {
  ArrowUUpLeftIcon,
  BuildingsIcon,
  ShieldStarIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { SidebarConfig } from "../types";

export function buildSuperSidebarConfig(
  activeOrgSlug?: string | null,
): SidebarConfig {
  return {
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
        href: activeOrgSlug ? `/${activeOrgSlug}` : "/post-login",
        icon: createElement(ArrowUUpLeftIcon),
      },
    ],
  };
}

