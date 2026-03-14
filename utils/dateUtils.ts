
/**
 * Safely parses a date string into a Date object.
 * Handles formats like yyyy-mm-dd, dd-mm-yyyy, dd/mm/yyyy.
 */
export const parseDate = (dateStr: string | any): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    // If it's a Firestore Timestamp-like object
    if (dateStr && typeof dateStr.toDate === 'function') {
        return dateStr.toDate();
    }

    const s = String(dateStr).trim();
    if (!s) return null;

    // Try standard parsing first (ISO, etc.)
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // Handle dd-mm-yyyy or dd/mm/yyyy
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
        // Check if first part is year (yyyy-mm-dd) or day (dd-mm-yyyy)
        if (parts[0].length === 4) {
            // yyyy-mm-dd
            d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else if (parts[2].length === 4) {
            // dd-mm-yyyy
            d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        
        if (!isNaN(d.getTime())) return d;
    }

    return null;
};

/**
 * Formats a date string for display.
 */
export const formatDate = (dateStr: string | any): string => {
    const d = parseDate(dateStr);
    if (!d) return 'Invalid Date';
    return d.toLocaleDateString('en-IN');
};

/**
 * Checks if a date is within a range.
 */
export const isDateInRange = (dateStr: string | any, startDateStr: string, endDateStr: string): boolean => {
    const d = parseDate(dateStr);
    if (!d) return false;

    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;

    if (start) {
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
    }

    if (end) {
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
    }

    return true;
};
