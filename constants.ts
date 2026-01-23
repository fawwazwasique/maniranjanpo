
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

export const ITEM_CATEGORIES = [
    'Filter',
    'Core',
    'Recon',
    'Battery',
    'Oil',
    'Local Parts',
    'Auto Parts',
    'Growth Parts'
];

export const BULK_UPLOAD_HEADERS = [
    'Main -Branch',
    'Sub - branch',
    'Account Name',
    'SO.NO',
    'SO DATE',
    'PO.NO',
    'PO DATE',
    'Po Status',
    'Sale Type',
    'Credit Days',
    'Billing Plan',
    'Materials',
    'Eta Available',
    'General Remarks',
    'Invoice Number',
    'Invoice Date',
    'Item: Item Name',
    'Item: Item Type',
    'Category',
    'Item: Item Description',
    'Quantity',
    'Unit Price',
    'Discount Amount',
    'Base Amount',
    'Tax Amount',
    'Gross Amount',
    'Stock Available',
    'Stock In Hand',
    'Item Status',
    'Oa No',
    'Oa Date',
    'Item Remarks',
    'Billing Address',
    'Bill To GSTIN',
    'Shipping Address',
    'Ship To GSTIN',
    'Quote Number'
];
