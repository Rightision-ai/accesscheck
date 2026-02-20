/**
 * British Date Formatting Utilities for UK OT Panel
 * Ensures all dates comply with UK standards (DD/MM/YYYY)
 */

/**
 * Formats ISO date string to British date format (DD/MM/YYYY)
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date in DD/MM/YYYY format
 */
export const formatBritishDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formats ISO date string to British date-time format (DD/MM/YYYY HH:mm)
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date-time in DD/MM/YYYY HH:mm format
 */
export const formatBritishDateTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

/**
 * Formats ISO date string to British short date-time (DD/MM/YY at HH:mm)
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted short date-time
 */
export const formatBritishShortDateTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
    const timeStr = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return `${dateStr} at ${timeStr}`;
};
