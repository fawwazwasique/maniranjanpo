import { POItemStatus, OverallPOStatus } from './types';

export const ALL_STATUSES = Object.values(POItemStatus);
export const ALL_PO_STATUSES = Object.values(OverallPOStatus);

export const BRANCH_STRUCTURE: Record<string, string[]> = {
    'Bengaluru': ['Attibele', 'Byappanhalli', 'Peenya'],
    'Mangalore': ['Mangalore', 'Ankola', 'Chitradurga', 'Shimoga'],
    'Mysore': ['Mysore', 'Hassan', 'Kodagu'],
    'North Karnataka': ['Belagavi', 'Kalaburagi', 'Hospet', 'Hubli', 'Vijayapur', 'Ballari'],
};

export const MAIN_BRANCHES = Object.keys(BRANCH_STRUCTURE);

export const CUSTOMERS = [
    'Innovate Inc.',
    'Quantum Solutions',
    'Apex Industries',
    'Stellar Corp',
    'Nexus Enterprises'
];
