import { Project, SourceFile, Scope } from "ts-morph";
import { IdlIR } from "../ir";
import { mapIdlTypeToTs, toCamelCase } from "../utils";

export function generateMethods(ir: IdlIR, project: Project): SourceFile {
  const file = project.createSourceFile("solsorcery.ts", "", { overwrite: true });

  // Import necessary types
  file.addImportDeclarations([
    {
      namedImports: ["Program", "Idl", "Provider"],
      moduleSpecifier: "@coral-xyz/anchor",
    },
    {
      namedImports: ["PublicKey", "TransactionInstruction"],
      moduleSpecifier: "@solana/web3.js",
    },
    { namedImports: [ir.metadata?.name ?? "ProgramIdl"], moduleSpecifier: "./types" },
  ]);

  // Generate SDK class
  const sdkClass = file.addClass({
    name: `${ir.metadata?.name ?? "Program"}SDK`,
    isExported: true,
  });

  // Add constructor
  sdkClass.addConstructor({
    parameters: [
      { name: "program", type: `Program<${ir.metadata?.name ?? "ProgramIdl"}>` },
      { name: "provider", type: "Provider" },
    ],
    statements: [
      `this.program = program;`,
      `this.provider = provider;`,
    ],
  });

  // Add properties
  sdkClass.addProperties([
    {
      name: "program",
      type: `Program<${ir.metadata?.name ?? "ProgramIdl"}>`,
      scope: Scope.Private,
    },
    { name: "provider", type: "Provider", scope: Scope.Private },
  ]);

  // Generate methods for each instruction
  ir.instructions.forEach((instr) => {
    const method = sdkClass.addMethod({
      name: toCamelCase(instr.name),
      isAsync: true,
      returnType: "Promise<TransactionInstruction>",
    });

    // Add parameters
    const params = instr.args.map((arg) => ({
      name: arg.name,
      type: mapIdlTypeToTs(arg.type),
    }));
    params.push({
      name: "accounts",
      type: `{ ${instr.accounts
        .map((acc) => `${acc.name}: PublicKey`)
        .join("; ")} }`,
    });
    method.addParameters(params);

    // Add method body
    method.setBodyText(`
      return this.program.methods
        .${instr.name}(${instr.args.map((arg) => arg.name).join(", ")})
        .accounts(accounts)
        .instruction();
    `);
  });

  file.formatText({ indentSize: 2 });
  return file;
}