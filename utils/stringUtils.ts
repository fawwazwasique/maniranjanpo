
/**
 * Normalizes a string value against a list of allowed values (case-insensitive).
 * If a match is found, returns the original allowed value with its correct casing.
 * Otherwise, returns the trimmed original value.
 */
export const normalizeToAllowedValue = (value: string | undefined | null, allowedValues: string[]): string => {
    if (value === undefined || value === null) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    
    const normalized = trimmed.toLowerCase();
    const match = allowedValues.find(v => v.trim().toLowerCase() === normalized);
    return match || trimmed;
};

/**
 * Normalizes a string value against an enum's values (case-insensitive).
 */
export const normalizeEnum = <T extends string>(value: string | undefined | null, enumObj: Record<string, T>): T | string => {
    if (value === undefined || value === null) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    const normalized = trimmed.toLowerCase();
    const match = Object.values(enumObj).find(v => v.toLowerCase() === normalized);
    return match || trimmed;
};
