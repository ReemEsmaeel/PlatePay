import type { Types } from "mongoose";
import { AuditLogModel } from "../models";

export async function writeAuditLog(input: {
  actorId: Types.ObjectId;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  await AuditLogModel.create({
    ...input,
    details: input.details ?? {},
  });
}
