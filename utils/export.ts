
import { PurchaseOrder } from '../types';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = [
        'Main Branch',
        'Sub Branch',
        'Account Name',
        'PO Number',
        'PO Date',
        'SO Number',
        'SO Date',
        'Quote Number',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Sale Type',
        'Credit Terms',
        'P & F Available',
        'B-Check',
        'C-Check',
        'D-Check',
        'Battery',
        'Spares',
        'BD',
        'Radiator Descaling',
        'Others',
        'Checklist Remarks',
        'Item Name',
        'Item Type',
        'Item Description',
        'Quantity',
        'Unit Price',
        'Discount',
        'GST',
        'Stock Status',
        'OA Number',
        'OA Date'
    ];

    const rows: string[] = [];

    const safe = (str: any) => {
        if (str === undefined || str === null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    data.forEach(po => {
        const checklist = po.checklist || {
            bCheck: false,
            cCheck: false,
            dCheck: false,
            battery: false,
            spares: false,
            bd: false,
            radiatorDescaling: false,
            others: false,
        };
        const items = po.items && po.items.length > 0 ? po.items : [{} as any];

        items.forEach(item => {
            const row = [
                safe(po.mainBranch),
                safe(po.subBranch),
                safe(po.customerName),
                safe(po.poNumber),
                safe(po.poDate),
                safe(po.salesOrderNumber),
                safe(po.soDate),
                safe(po.quoteNumber),
                safe(po.billingAddress),
                safe(po.billToGSTIN),
                safe(po.shippingAddress),
                safe(po.shipToGSTIN),
                safe(po.saleType),
                safe(po.creditTerms),
                safe(po.pfAvailable ? 'TRUE' : 'FALSE'),
                safe(checklist.bCheck ? 'TRUE' : 'FALSE'),
                safe(checklist.cCheck ? 'TRUE' : 'FALSE'),
                safe(checklist.dCheck ? 'TRUE' : 'FALSE'),
                safe(checklist.battery ? 'TRUE' : 'FALSE'),
                safe(checklist.spares ? 'TRUE' : 'FALSE'),
                safe(checklist.bd ? 'TRUE' : 'FALSE'),
                safe(checklist.radiatorDescaling ? 'TRUE' : 'FALSE'),
                safe(checklist.others ? 'TRUE' : 'FALSE'),
                safe(po.checklistRemarks),
                safe(item.partNumber),
                safe(item.itemType),
                safe(item.itemDesc),
                safe(item.quantity),
                safe(item.rate),
                safe(item.discount),
                safe(item.gst),
                safe(item.status),
                safe(item.oaNo),
                safe(item.oaDate)
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
    const headers = [
        'Main Branch',
        'Sub Branch',
        'Account Name',
        'PO Number',
        'PO Date',
        'SO Number',
        'SO Date',
        'Quote Number',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Sale Type',
        'Credit Terms',
        'P & F Available (TRUE/FALSE)',
        'B-Check (TRUE/FALSE)',
        'C-Check (TRUE/FALSE)',
        'D-Check (TRUE/FALSE)',
        'Battery (TRUE/FALSE)',
        'Spares (TRUE/FALSE)',
        'BD (TRUE/FALSE)',
        'Radiator Descaling (TRUE/FALSE)',
        'Others (TRUE/FALSE)',
        'Checklist Remarks',
        'Item Name',
        'Item Type',
        'Item Description',
        'Quantity',
        'Unit Price',
        'Discount',
        'GST',
        'Stock Status (Available/Unavailable)',
        'OA Number',
        'OA Date'
    ];
    
    const exampleRow = [
        'Bengaluru',
        'Peenya',
        'Innovate Inc.',
        'PO-2024-001',
        '2024-03-15',
        'SO-2024-001',
        '2024-03-16',
        'QT-2024-100',
        '123 Industrial Area, Bengaluru',
        '29ABCDE1234F1Z5',
        '456 Warehouse Rd, Peenya',
        '29ABCDE1234F1Z5',
        'Credit',
        '30',
        'TRUE',
        'TRUE',
        'FALSE',
        'FALSE',
        'FALSE',
        'TRUE',
        'FALSE',
        'FALSE',
        'FALSE',
        '',
        'VALV-5W30-4L',
        'Lubricant',
        'Valvoline 5W30 Motor Oil 4L',
        '10',
        '1200.00',
        '100.00',
        '18',
        'Available',
        'OA-9912',
        '2024-03-20'
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
