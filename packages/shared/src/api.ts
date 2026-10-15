import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type ApiMeta = { page: number; limit: number; total: number };
export type ApiSuccess<T> = { success: true; data: T; meta?: ApiMeta };
export type ApiError = { success: false; code: string; message: string };
