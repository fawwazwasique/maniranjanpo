
import { PurchaseOrder } from '../types';
import { BULK_UPLOAD_HEADERS } from '../constants';
import { truncateToTwoDecimals } from './currencyUtils';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = BULK_UPLOAD_HEADERS;
    const rows: string[] = [];

    const safe = (str: any) => {
        if (str === undefined || str === null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    data.forEach(po => {
        // Use filteredItems if available (from Dashboard/AllOrdersPane), otherwise fallback to po.items
        const items = (po as any).filteredItems || po.items || [{} as any];

        items.forEach(item => {
            const row = [
                safe(po.mainBranch),        // 1
                safe(po.subBranch),         // 2
                safe(po.customerName),       // 3
                safe(po.salesOrderNumber),   // 4
                safe(po.soDate),             // 5
                safe(po.poNumber),           // 6
                safe(po.poDate),             // 7
                safe(po.status),             // 8
                safe(po.orderStatus),        // 9
                safe(po.saleType),           // 10
                safe(po.creditTerms),        // 11
                safe(po.billingPlan),        // 12
                safe(po.materials),          // 13
                safe(po.etaAvailable),       // 14
                safe(po.generalRemarks),     // 15
                safe(po.invoiceNumber),      // 16
                safe(po.invoiceDate),        // 17
                safe(po.customerCategory),   // 18
                safe(po.zone),               // 19
                safe(po.pfAvailable),        // 20
                safe(po.checklist?.bCheck),  // 21
                safe(po.checklist?.cCheck),  // 22
                safe(po.checklist?.dCheck),  // 23
                safe(po.checklist?.battery), // 24
                safe(po.checklist?.spares),  // 25
                safe(po.checklist?.bd),      // 26
                safe(po.checklist?.radiatorDescaling), // 27
                safe(po.checklist?.others),  // 28
                safe(po.dispatchRemarks),    // 29
                safe(item.partNumber),       // 30
                safe(item.itemType),         // 31
                safe(item.category),         // 32
                safe(item.itemDesc),         // 33
                safe(item.quantity),         // 34
                safe(truncateToTwoDecimals(item.rate).toFixed(2)),             // 35
                safe(truncateToTwoDecimals(item.discount).toFixed(2)),         // 36
                safe(truncateToTwoDecimals(item.baseAmount).toFixed(2)),       // 37
                safe(truncateToTwoDecimals(item.taxAmount).toFixed(2)),        // 38
                safe(truncateToTwoDecimals(item.grossAmount).toFixed(2)),      // 39
                safe(item.stockAvailable),    // 40
                safe(item.stockInHand),      // 41
                safe(item.status),           // 42
                safe(item.oaNo),             // 43
                safe(item.oaDate),           // 44
                safe(item.itemRemarks),      // 45
                safe(po.billingAddress),     // 46
                safe(po.billToGSTIN),        // 47
                safe(po.shippingAddress),    // 48
                safe(po.shipToGSTIN),        // 49
                safe(po.quoteNumber)         // 50
            ];
            rows.push(row.join(','));
        });
    });

    return [headers.join(','), ...rows].join('\n');
};

export const exportDataToCSV = (data: any[], filename: string): void => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
        headers.map(header => {
            const val = obj[header];
            if (val === undefined || val === null) return '""';
            const s = String(val).replace(/"/g, '""');
            return `"${s}"`;
        }).join(',')
    );
    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportToCSV = (data: PurchaseOrder[], filename: string = 'purchase_orders_detailed.csv'): void => {
    const csvString = convertToCSV(data);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const downloadTemplate = (): void => {
    const headers = BULK_UPLOAD_HEADERS;
    
    const safe = (str: any) => {
        if (str === undefined || str === null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    const exampleRow = [
        'Bengaluru',          // Main Branch
        'Peenya',             // Sub Branch
        'Innovate Inc.',
        'SO-9912',
        '2024-03-20',
        'PO-2024-001',
        '2024-03-15',
        'Available',          // Po Status
        'Open Orders',        // Order Status
        'Advance Payment',    // Sale Type
        '0',                  // Credit Days
        'Monthly',
        'Available',
        '2024-04-01',
        'Urgent requirement',
        'INV-5501',           // Invoice Number
        '2024-03-25',         // Invoice Date
        'AMC',                // Customer Category
        'East',               // Zone
        'TRUE',               // P & F Available
        'TRUE',               // B-Check
        'FALSE',              // C-Check
        'FALSE',              // D-Check
        'TRUE',               // Battery
        'FALSE',              // Spares
        'FALSE',              // BD
        'FALSE',              // Radiator Descaling
        'FALSE',              // Others
        '',                   // Dispatch Remarks
        'VALV-5W30-4L',       // Item Name
        'Lubricant',
        'Oil',
        'Valvoline 5W30 Motor Oil 4L',
        '10',
        '1200.00',
        '100.00',
        '12000.00',
        '2160.00',
        '14060.00',
        '5',                  // Stock Available
        '100',                 // Stock In Hand
        'Not Available',
        'OA-123',
        '2024-03-21',
        'First batch',
        '123 Industrial Area, Bengaluru', // Billing Address
        '29ABCDE1234F1Z5',                // Bill To GSTIN
        '456 Warehouse Rd, Peenya',       // Shipping Address
        '29ABCDE1234F1Z5',                // Ship To GSTIN
        'QT-2024-100'                     // Quote Number
    ].map(safe);

    const csvContent = [
        headers.join(','), 
        exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadStockTemplate = (): void => {
    const headers = ['Item Name', 'Item Description', 'Quantity', 'Branch'];
    const exampleRow = ['VALV-5W30-4L', 'Valvoline 5W30 Motor Oil 4L', '50', 'Bengaluru'];
    
    const csvContent = [
        headers.join(','), 
        exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
