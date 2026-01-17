
import { PurchaseOrder } from '../types';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = [
        // Primary columns matching User Screenshot
        'Branch',
        'Sale Order Number',
        'Dates (PO Date)',
        'Account Name',
        'Zone',
        'Po Status',
        'Overall Remarks',
        'OA Number',
        'OA Date',
        'ETA',
        'Billing Status',
        'Material Status',
        'Payment Status',
        'Item Part Number',
        'Item Description',
        'Quantity',
        'Stock Available',
        'Stock In Hand',
        'Unit Price',
        'Base Amount',
        'Discount',
        'Tax Amount',
        'Gross Amount',
        'Item Remarks',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Quote Number',

        // App-specific metadata appended at last
        'Sub Branch',
        'Sale Type',
        'Credit Terms',
        'Fulfillment Status',
        'P & F Available',
        'Dispatch Remarks',
        'Checklist: B-Check',
        'Checklist: C-Check',
        'Checklist: D-Check',
        'Checklist: Battery',
        'Checklist: Spares',
        'Checklist: BD',
        'Checklist: Radiator Descaling',
        'Checklist: Others',
        'Checklist Remarks',
        'Created At'
    ];

    const rows: string[] = [];

    // Helper to escape CSV fields
    const safe = (str: string | number | undefined | null) => {
        if (str === undefined || str === null) return '';
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
        const items = po.items && po.items.length > 0 ? po.items : [{
            partNumber: '', quantity: 0, rate: 0, status: '', discount: 0, gst: 0
        } as any];

        items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const gst = Number(item.gst) || 0;
            
            const baseVal = qty * rate;
            const netTaxable = baseVal - discount;
            const taxAmt = netTaxable * (gst / 100);
            const totalAmt = netTaxable + taxAmt;

            const row = [
                // Primary Columns
                safe(po.mainBranch),
                safe(po.salesOrderNumber),
                safe(po.poDate),
                safe(po.customerName),
                safe(po.subBranch), // Zone mapping
                safe(po.orderStatus),
                safe(po.systemRemarks),
                safe(item.oaNo),
                safe(item.oaDate),
                safe(''), // ETA placeholder
                safe(po.fulfillmentStatus), // Billing Status mapping
                safe(item.status), // Material Status mapping
                safe(po.paymentStatus),
                safe(item.partNumber),
                safe(item.itemDesc),
                safe(qty),
                safe(item.stockAvailable),
                safe(item.stockInHand),
                safe(rate),
                safe(baseVal.toFixed(2)),
                safe(discount),
                safe(taxAmt.toFixed(2)),
                safe(totalAmt.toFixed(2)),
                safe(''), // Item Remarks placeholder
                safe(po.billingAddress),
                safe(po.billToGSTIN),
                safe(po.shippingAddress),
                safe(po.shipToGSTIN),
                safe(po.quoteNumber),

                // Technical Metadata
                safe(po.subBranch),
                safe(po.saleType),
                safe(po.creditTerms),
                safe(po.fulfillmentStatus),
                safe(po.pfAvailable ? 'Yes' : 'No'),
                safe(po.dispatchRemarks),
                safe(checklist.bCheck ? 'Yes' : 'No'),
                safe(checklist.cCheck ? 'Yes' : 'No'),
                safe(checklist.dCheck ? 'Yes' : 'No'),
                safe(checklist.battery ? 'Yes' : 'No'),
                safe(checklist.spares ? 'Yes' : 'No'),
                safe(checklist.bd ? 'Yes' : 'No'),
                safe(checklist.radiatorDescaling ? 'Yes' : 'No'),
                safe(checklist.others ? 'Yes' : 'No'),
                safe(po.checklistRemarks),
                safe(po.createdAt)
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
        'Branch',
        'Sale Order Number',
        'Dates (YYYY-MM-DD)',
        'Account Name',
        'Zone',
        'Po Status',
        'Overall Remarks',
        'OA Number',
        'OA Date (YYYY-MM-DD)',
        'ETA',
        'Billing Status',
        'Material Status',
        'Payment Status',
        'Item Part Number',
        'Item Description',
        'Quantity',
        'Stock Available',
        'Stock In Hand',
        'Unit Price',
        'Base Amount',
        'Discount',
        'Tax Amount',
        'Gross Amount',
        'Item Remarks',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Quote Number',
        // New items added at last as per instructions
        'Sub Branch',
        'P & F Available (TRUE/FALSE)',
        'Checklist B (TRUE/FALSE)',
        'Checklist C (TRUE/FALSE)',
        'Checklist D (TRUE/FALSE)',
        'Checklist Battery (TRUE/FALSE)',
        'Checklist Spares (TRUE/FALSE)',
        'Checklist BD (TRUE/FALSE)',
        'Checklist Radiator Descaling (TRUE/FALSE)',
        'Checklist Others (TRUE/FALSE)',
        'Checklist Remarks'
    ];
    
    const exampleRow = [
        'Bengaluru',
        'SO-2024-001',
        '2024-03-15',
        'Innovate Inc.',
        'Peenya',
        'Open Orders',
        'Urgent delivery required',
        'OA-9912',
        '2024-03-16',
        '2024-03-25',
        'Fully Available',
        'Available',
        'Pending',
        'VALV-5W30-4L',
        'Valvoline 5W30 Motor Oil 4L',
        '10',
        '50',
        '40',
        '1200.00',
        '12000.00',
        '0.00',
        '2160.00',
        '14160.00',
        'Fragile handling',
        '123 Industrial Area',
        '29ABCDE1234F1Z5',
        '456 Warehouse Rd',
        '29ABCDE1234F1Z5',
        'QT-2024-100',
        // New at last
        'Peenya',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        'FALSE',
        ''
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
