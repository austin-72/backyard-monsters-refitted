import z from "zod";
import { ClientSafeError } from "../middleware/clientSafeError.js";
import { Status } from "../enums/StatusCodes.js";

/**
 * Checks a form the player filled in (register, change name): on bad input the player is told what is
 * wrong (400 with the schema's own message, e.g. "Password must be at least 8 characters long") instead
 * of the server failing with "Something went wrong" (500), which also filled the admin panel's Bugs tab.
 *
 * @param {z.ZodType} schema - The schema to check against.
 * @param {unknown} data - The request body.
 * @returns The parsed data.
 * @throws {ClientSafeError} 400 with the first problem found.
 */
export const parseInput = <T extends z.ZodType>(schema: T, data: unknown): z.output<T> => {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const message = result.error.issues[0]?.message || "Some of the details sent are not valid.";
  throw new ClientSafeError({ message, status: Status.BAD_REQUEST, data: {}, isClientFriendly: true });
};
