import { GraphQLError } from "graphql";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";

export const unauthenticated = () =>
  new GraphQLError("Sign in required", { extensions: { code: "UNAUTHENTICATED" } });

export const forbidden = (message = "Not allowed") =>
  new GraphQLError(message, { extensions: { code: "FORBIDDEN" } });

export const notFound = (what: string) =>
  new GraphQLError(`${what} not found`, { extensions: { code: "NOT_FOUND" } });

export const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

/** Validate with zod, turning failures into a BAD_USER_INPUT GraphQL error. */
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw badInput(z.prettifyError(result.error));
  return result.data;
}

/** Parse an id argument; malformed ids are reported as "not found". */
export function objectId(id: string, what: string): Types.ObjectId {
  if (!isValidObjectId(id)) throw notFound(what);
  return new Types.ObjectId(id);
}
