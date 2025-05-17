/**
 * This code is Intermediate Representation (IR) for Anchor IDL 
 * It is used to represent the structure of the IDL in a more manageable way
 * IR normalizes the IDL and makes it easier to work with
 * We will be using Zod for Anchor IDL validation
 */ 

import { z } from "zod";
import { toCamelCase } from "./utils";

const IdlTypeSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.object({
      option: IdlTypeSchema,
    }),
    z.object({
      vec: IdlTypeSchema,
    }),
    z.object({
      defined: z.string(),
    }),
    z.object({
      array: z.tuple([IdlTypeSchema, z.number()]),
    }),
  ])
);

// Zod schema for Anchor IDL
const IdlSchema = z.object({
  address: z.string().optional(),
  metadata: z
    .object({
      name: z.string(),
      version: z.string(),
      spec: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  instructions: z.array(
    z.object({
      name: z.string(),
      discriminator: z.array(z.number()),
      accounts: z.array(
        z.object({
          name: z.string(),
          writable: z.boolean().optional(),
          signer: z.boolean().optional(),
          pda: z
            .object({
              seeds: z.array(
                z.object({
                  kind: z.enum(["const", "account", "arg"]),
                  value: z.array(z.number()).optional(),
                  path: z.string().optional(),
                })
              ),
              program: z
                .object({
                  kind: z.string(),
                  value: z.array(z.number()),
                })
                .optional(),
            })
            .optional(),
          address: z.string().optional(),
          docs: z.array(z.string()).optional(),
        })
      ),
      args: z.array(
        z.object({
          name: z.string(),
          type: IdlTypeSchema,
        })
      ),
      docs: z.array(z.string()).optional(),
    })
  ),
  accounts: z.array(
    z.object({
      name: z.string(),
      discriminator: z.array(z.number()),
    })
  ),
  types: z.array(
    z.object({
      name: z.string(),
      type: z.object({
        kind: z.enum(["struct", "enum"]),
        fields: z
          .array(
            z.object({
              name: z.string(),
              type: IdlTypeSchema,
            })
          )
          .optional(),
      }),
    })
  ),
  errors: z.array(
    z.object({
      code: z.number(),
      name: z.string(),
      msg: z.string(),
    })
  ),
  constants: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  }
);

// TypeScript type for IDL types
export type IdlType =
  | string
  | { option: IdlType }
  | { vec: IdlType }
  | { defined: string }
  | { array: [IdlType, number] };

// IR TypeScript Types
export interface IdlIR {
  programId: string | null;
  metadata: {
    name: string;
    version: string;
    description?: string;
  } | null;
  instructions: {
    name: string;
    camelName: string;
    accounts: {
      name: string;
      isWritable: boolean;
      isSigner: boolean;
      isPda: boolean;
      pdaSeeds?: {
        kind: "const" | "account" | "arg";
        value?: number[];
        path?: string;
      }[];
      address?: string;
      docs?: string[];
    }[];
    args: { name: string; type: IdlType }[];
    docs?: string[];
  }[];
  accounts: { name: string; discriminator: number[] }[];
  types: {
    name: string;
    kind: "struct" | "enum";
    fields?: {
      name: string;
      type: IdlType;
    }[];
  }[];
  errors: { code: number; name: string; msg: string }[];
  constants?: { name: string; type: string; value: string }[];
}

// We have to parse the IDL to IR
export function parseIdlToIr(idlJson: unknown): IdlIR {
  // We will first validate the IDL using Zod
  const idl = IdlSchema.parse(idlJson);

  // Then we will convert the IDL to IR
  return {
    programId: idl.address ?? null,
    metadata: idl.metadata
      ? {
          name: idl.metadata.name,
          version: idl.metadata.version,
          description: idl.metadata.description,
        }
      : null,
    instructions: idl.instructions.map((instr) => ({
      name: instr.name,
      camelName: toCamelCase(instr.name),
      accounts: instr.accounts.map((acc) => ({
        name: acc.name,
        isWritable: acc.writable ?? false,
        isSigner: acc.signer ?? false,
        isPda: !!acc.pda,
        pdaSeeds: acc.pda?.seeds,
        address: acc.address,
        docs: acc.docs,
      })),
      args: instr.args as { name: string; type: IdlType }[],
      docs: instr.docs,
    })),
    accounts: idl.accounts,
    types: idl.types.map((t) => ({
      name: t.name,
      kind: t.type.kind,
      fields: t.type.fields
        ? t.type.fields.map((field) => ({
            name: field.name,
            type: field.type as IdlType,
          }))
        : undefined,
    })),
    errors: idl.errors.map((err) => ({
      code: err.code,
      name: err.name,
      msg: err.msg,
    })),
    constants: idl.constants,
  };
}