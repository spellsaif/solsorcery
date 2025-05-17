import { IdlType } from "./ir";

export const toCamelCase = (str:string) => {
    return str
        .split('_')
        .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}


// Map IDL types to TypeScript types
export const mapIdlTypeToTs = (type: IdlType): string => {
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
  } else if ("option" in type) {
    return `${mapIdlTypeToTs(type.option)} | null`;
  } else if ("vec" in type) {
    return `${mapIdlTypeToTs(type.vec)}[]`;
  } else if ("defined" in type) {
    return type.defined;
  } else if ("array" in type) {
    return `${mapIdlTypeToTs(type.array[0])}[]`;
  }
  return "unknown";
};