import {Project, SourceFile} from 'ts-morph';
import { IdlIR } from '../ir';
import { mapIdlTypeToTs } from '../utils';

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


