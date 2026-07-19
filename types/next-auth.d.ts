import { Role } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isDemo: boolean;
      demoExpiresAt: Date | null;
    } & NonNullable<DefaultSession["user"]>;
  }

  interface User {
    role: Role;
    demoExpiresAt?: Date | null;
  }
}
