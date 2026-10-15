import bcrypt from "bcryptjs";
import type { AdminProfile } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { getPrisma } from "../lib/prisma";
import { signAdminToken } from "./token.service";

// Compared against when the email is unknown so response time doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function loginAdmin(
  storeId: string,
  email: string,
  password: string,
): Promise<{ token: string; admin: AdminProfile }> {
  const prisma = getPrisma();
  const user = await prisma.adminUser.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.isActive || !valid) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    token: signAdminToken({ sub: user.id, storeId, role: user.role }),
    admin: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
