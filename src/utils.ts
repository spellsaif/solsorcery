
export const toCamelCase = (str:string) => {
    return str
        .split('_')
        .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}