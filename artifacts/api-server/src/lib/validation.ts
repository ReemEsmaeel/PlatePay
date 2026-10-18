import type { Response } from "express";

type ParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { issues: Array<{ path: Array<string | number>; message: string }> };
    };

interface ParseSchema<T> {
  safeParse(input: unknown): ParseResult<T>;
}

export function validate<T>(
  schema: ParseSchema<T>,
  input: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(input);
  if (!result.success) {
    res.status(400).json({
      error: "Request validation failed.",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return null;
  }
  return result.data;
}
