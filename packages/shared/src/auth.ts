import { z } from "zod";

export const adminRoles = ["OWNER", "MANAGER", "CALL_AGENT", "PACKER"] as const;
export const adminRoleSchema = z.enum(adminRoles);
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: adminRoleSchema,
});
export type AdminProfile = z.infer<typeof adminProfileSchema>;
