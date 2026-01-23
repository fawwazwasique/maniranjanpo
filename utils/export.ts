
import { PurchaseOrder } from '../types';
import { BULK_UPLOAD_HEADERS } from '../constants';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = BULK_UPLOAD_HEADERS;
    const rows: string[] = [];

    const safe = (str: any) => {
        if (str === undefined || str === null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    data.forEach(po => {
        const items = po.items && po.items.length > 0 ? po.items : [{} as any];

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
                safe(po.saleType),           // 9
                safe(po.creditTerms),        // 10
                safe(po.billingPlan),        // 11
                safe(po.materials),          // 12
                safe(po.etaAvailable),       // 13
                safe(po.generalRemarks),     // 14
                safe(po.invoiceNumber),      // 15
                safe(po.invoiceDate),        // 16
                safe(item.partNumber),       // 17
                safe(item.itemType),         // 18
                safe(item.category),         // 19
                safe(item.itemDesc),         // 20
                safe(item.quantity),         // 21
                safe(item.rate),             // 22
                safe(item.discount),         // 23
                safe(item.baseAmount),       // 24
                safe(item.taxAmount),        // 25
                safe(item.grossAmount),      // 26
                safe(item.stockAvailable),    // 27
                safe(item.stockInHand),      // 28
                safe(item.status),           // 29
                safe(item.oaNo),             // 30
                safe(item.oaDate),           // 31
                safe(item.itemRemarks),      // 32
                safe(po.billingAddress),     // 33
                safe(po.billToGSTIN),        // 34
                safe(po.shippingAddress),    // 35
                safe(po.shipToGSTIN),        // 36
                safe(po.quoteNumber)         // 37
            ];
            rows.push(row.join(','));
        });
    });

    return [headers.join(','), ...rows].join('\n');
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
    const exampleRow = [
        'Bengaluru',          // Main Branch
        'Peenya',             // Sub Branch
        'Innovate Inc.',
        'SO-9912',
        '2024-03-20',
        'PO-2024-001',
        '2024-03-15',
        'Available',
        'Credit',
        '30',
        'Monthly',
        'Available',
        '2024-04-01',
        'Urgent requirement',
        'INV-5501',           // Invoice Number
        '2024-03-25',         // Invoice Date
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
        '5',
        '100',
        'Not Available',
        'OA-123',
        '2024-03-21',
        'First batch',
        '123 Industrial Area, Bengaluru', // Billing Address
        '29ABCDE1234F1Z5',                // Bill To GSTIN
        '456 Warehouse Rd, Peenya',       // Shipping Address
        '29ABCDE1234F1Z5',                // Ship To GSTIN
        'QT-2024-100'                     // Quote Number
    ];

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
    const headers = ['Part Number', 'Description', 'Quantity'];
    const exampleRow = ['VALV-5W30-4L', 'Valvoline 5W30 Motor Oil 4L', '50'];
    
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
