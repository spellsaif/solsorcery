import { Project, SourceFile } from "ts-morph";
import { IdlIR } from "../ir";
import { mapIdlTypeToTs } from '../utils';

export function generateHooks(ir: IdlIR, project: Project): SourceFile {
  const file = project.createSourceFile("hooks.ts", "", { overwrite: true });

  file.addImportDeclarations([
    { namedImports: ["useMutation"], moduleSpecifier: "@tanstack/react-query" },
    { namedImports: ["useConnection", "useWallet"], moduleSpecifier: "@solana/wallet-adapter-react" },
    { namedImports: ["PublicKey", "Transaction"], moduleSpecifier: "@solana/web3.js" },
    { namedImports: [`${ir.metadata?.name ?? "Program"}SDK`], moduleSpecifier: "./sdk" },
  ]);

  ir.instructions.forEach((instr) => {
    const hookName = `use${instr.camelName}`;
    file.addFunction({
      name: hookName,
      isExported: true,
      parameters: [{ name: "sdk", type: `${ir.metadata?.name ?? "Program"}SDK` }],
      statements: `
        const { connection } = useConnection();
        const { publicKey, sendTransaction } = useWallet();
        return useMutation({
          mutationFn: async (input: { ${instr.args
            .map((arg) => `${arg.name}: ${mapIdlTypeToTs(arg.type)}`)
            .join("; ")}; accounts: { ${instr.accounts
            .map((acc) => `${acc.name}: PublicKey`)
            .join("; ")} } }) => {
            if (!publicKey) throw new Error("Wallet not connected");
            const instruction = await sdk.${instr.name}(
              ${instr.args.map((arg) => `input.${arg.name}`).join(", ")},
              input.accounts
            );
            const transaction = new Transaction().add(instruction);
            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature);
            return signature;
          },
        });
      `,
    });
  });

  file.formatText({ indentSize: 2 });
  return file;
}