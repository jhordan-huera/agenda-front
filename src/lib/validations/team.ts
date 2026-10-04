import { z } from "zod";
import { emailField, requiredText } from "./fields";

export const teamRoleSchema = z.enum(["admin", "staff"], { error: "Selecciona un rol" });

export const teamInviteSchema = z.object({
  firstName: requiredText("El nombre"),
  lastName: requiredText("El apellido"),
  email: emailField,
  role: teamRoleSchema,
});

export type TeamInviteInput = z.infer<typeof teamInviteSchema>;
