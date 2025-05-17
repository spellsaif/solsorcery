import fs from 'fs/promises';
import {parseIdlToIr, IdlIR} from './ir';

export const parseIdlFile = async(path:string):Promise<IdlIR> => {
    try {
        const idl = JSON.parse(await fs.readFile(path, 'utf-8'));
        return parseIdlToIr(idl);
    } catch (error) {
        throw new Error(`Failed to parse IDL file: ${error.message}`);
    }
}