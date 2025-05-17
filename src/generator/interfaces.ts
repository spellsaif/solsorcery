import {Project, SourceFile} from 'ts-morph';
import { IdlIR } from '../ir';

export const generateInterface = (ir: IdlIR, project:Project): SourceFile => {
    const file = project.createSourceFile("types.ts", "", {overwrite:true});

    //import necessary types
    file.addImportDeclaration({
        namedImports: ["PublicKey"],
        moduleSpecifier: "@solana/web3.js"
    })

    //Generate Account Interface
    ir.accounts.forEach((account) => {
        file.addInterface({
            name: account.name,
            isExported: true,
            properties: [
                {name: "discriminator", type: "number[]"}
            ]
        })
    })

    //Generate Type Interfaces
    ir.types.forEach((type) => {
        if(type.kind === 'struct') {
            file.addInterface({
                name:type.name,
                isExported:true,
                properties: type.fields?.map((field) => ({
                    name: field.name,
                    type: mapIdlTypeToTs(field.type)
                }))
            })
        } else if (type.kind === 'enum') {
            file.addEnum({
                name:type.name,
                isExported: true,
                members: type.fields?.map((field) => ({
                    name: field.name,
                    value:field.name
                }))
            })
        }
    })

    // Generate Error Interfaces
    file.addInterface({
        name: "ProgramError",
        isExported: true,
        properties: [
            {name: "code", type: "number"},
            {name: "name", type: "string"},
            {name: "message", type: "string"},
        ]
    })

    file.formatText({indentSize:2});
    return file;
}


// Map IDL types to TypeScript types
function mapIdlTypeToTs(type: string | object): string {
  if (typeof type === "string") {
    switch (type) {
      case "u8":
      case "u16":
      case "u32":
      case "u64":
      case "i8":
      case "i16":
      case "i32":
      case "i64":
        return "number";
      case "pubkey":
        return "PublicKey";
      case "string":
        return "string";
      case "bool":
        return "boolean";
      default:
        return type; // Assume it's a custom type
    }
  } else if (typeof type === "object") {
    if ("option" in type) {
      return `${mapIdlTypeToTs(type.option)} | null`;
    } else if ("vec" in type) {
      return `${mapIdlTypeToTs(type.vec)}[]`;
    } else if ("defined" in type) {
      return type.defined;
    }
  }
  return "unknown";
}