import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import {
  adminAc,
  defaultAc,
  userAc,
} from "better-auth/plugins/admin/access";

import { db } from "@/lib/db/client";

import { sendEmail } from "./emails";

const superAdminAc = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as never);

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (!process.env.BETTER_AUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET es obligatoria en producción.");
  }
  console.warn(
    "[auth] BETTER_AUTH_SECRET no está definida. Solo permitido en desarrollo.",
  );
}

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña — Edunet",
        text: `Hola${user.name ? ` ${user.name}` : ""},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nAbre este enlace para continuar:\n${url}\n\nSi no fuiste tú, ignora este mensaje.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verifica tu correo — Edunet",
        text: `Hola${user.name ? ` ${user.name}` : ""},\n\nConfirma tu correo abriendo este enlace:\n${url}\n\nSi no creaste esta cuenta, ignora este mensaje.`,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  user: {
    additionalFields: {},
  },

  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["super_admin"],
      roles: {
        super_admin: superAdminAc,
        admin: adminAc,
        user: userAc,
      },
    }),
    organization(),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;
