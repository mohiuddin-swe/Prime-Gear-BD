import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/app-error";

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/** Validates and replaces body/query/params with the parsed (typed, coerced) values. */
export function validate(schemas: Schemas | ZodType): RequestHandler {
  const s: Schemas = "parse" in schemas ? { body: schemas } : schemas;
  return (req, _res, next) => {
    for (const part of ["body", "query", "params"] as const) {
      const schema = s[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const detail = result.error.issues
          .map((i) => `${[part, ...i.path].join(".")}: ${i.message}`)
          .join("; ");
        return next(AppError.badRequest(detail, "VALIDATION_ERROR"));
      }
      // req.query is a getter in Express 5, so define the property instead of assigning
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}
