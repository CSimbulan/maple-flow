// Writes schema.graphql from the Pothos schema; GraphQL Codegen reads that file.
import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { schema } from "../src/server/graphql/schema";

writeFileSync(new URL("../schema.graphql", import.meta.url), printSchema(schema) + "\n");
console.log("Wrote schema.graphql");
