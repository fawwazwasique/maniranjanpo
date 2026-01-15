
import { PurchaseOrder } from '../types';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = [
        // PO Details
        'PO ID',
        'PO Number',
        'Customer Name',
        'Main Branch',
        'Sub Branch',
        'PO Date',
        'SO Number',
        'SO Date',
        'Invoice Number',
        'Invoice Date',
        'Quote Number',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Sale Type',
        'Credit Terms (Days)',
        'Payment Status',
        'Payment Notes',
        'Overall PO Status',
        'Order Status',
        'Fulfillment Status',
        'System Remarks',
        'P&F Available',
        'Dispatch Remarks (Not Shipped Reason)',
        
        // Checklist
        'Checklist: B-Check',
        'Checklist: C-Check',
        'Checklist: D-Check',
        'Checklist: Battery',
        'Checklist: Spares',
        'Checklist: BD',
        'Checklist: Radiator Descaling',
        'Checklist: Others',
        'Checklist Remarks',
        
        // Item Details
        'Item Part Number',
        'Item Type',
        'Item Description',
        'Quantity',
        'Rate (Unit Price)',
        'Discount',
        'GST %',
        'Net Taxable Value',
        'Tax Amount',
        'Gross Amount',
        'Item Status',
        'Stock Status',
        'OA Number',
        'OA Date',
        'Stock Available',
        'Stock In Hand',
        'Allocated Qty',
        'Delivery Qty',
        'Invoiced Qty',
        
        // Metadata
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
                // PO Details
                safe(po.id),
                safe(po.poNumber),
                safe(po.customerName),
                safe(po.mainBranch),
                safe(po.subBranch),
                safe(po.poDate),
                safe(po.salesOrderNumber),
                safe(po.soDate),
                safe(po.invoiceNumber),
                safe(po.invoiceDate),
                safe(po.quoteNumber),
                safe(po.billingAddress),
                safe(po.billToGSTIN),
                safe(po.shippingAddress),
                safe(po.shipToGSTIN),
                safe(po.saleType),
                safe(po.creditTerms),
                safe(po.paymentStatus),
                safe(po.paymentNotes),
                safe(po.status),
                safe(po.orderStatus),
                safe(po.fulfillmentStatus),
                safe(po.systemRemarks),
                safe(po.pfAvailable ? 'Yes' : 'No'),
                safe(po.dispatchRemarks),
                
                // Checklist
                safe(checklist.bCheck ? 'Yes' : 'No'),
                safe(checklist.cCheck ? 'Yes' : 'No'),
                safe(checklist.dCheck ? 'Yes' : 'No'),
                safe(checklist.battery ? 'Yes' : 'No'),
                safe(checklist.spares ? 'Yes' : 'No'),
                safe(checklist.bd ? 'Yes' : 'No'),
                safe(checklist.radiatorDescaling ? 'Yes' : 'No'),
                safe(checklist.others ? 'Yes' : 'No'),
                safe(po.checklistRemarks),
                
                // Item Details
                safe(item.partNumber),
                safe(item.itemType),
                safe(item.itemDesc),
                safe(qty),
                safe(rate),
                safe(discount),
                safe(gst),
                safe(netTaxable.toFixed(2)),
                safe(taxAmt.toFixed(2)),
                safe(totalAmt.toFixed(2)),
                safe(item.status),
                safe(item.stockStatus),
                safe(item.oaNo),
                safe(item.oaDate),
                safe(item.stockAvailable),
                safe(item.stockInHand),
                safe(item.allocatedQuantity),
                safe(item.deliveryQuantity),
                safe(item.invoicedQuantity),
                
                // Metadata
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
        'Main Branch',
        'Sub Branch',
        'Customer Name',
        'PO Number',
        'PO Date (YYYY-MM-DD)',
        'SO Number',
        'SO Date (YYYY-MM-DD)',
        'Quote Number',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Item Name',
        'Item Type',
        'Item Description',
        'Quantity',
        'Unit Price',
        'Discount Amount',
        'GST Percentage',
        'Stock Status (Available/Unavailable)',
        'Item Status (Available/Partially Available/Not Available/Dispatched)',
        'OA Number',
        'OA Date (YYYY-MM-DD)',
        'Sale Type (Cash/Credit)',
        'Credit Terms (Days)',
        'Order Status',
        'Fulfillment Status (Fully Available/Partially Available/Not Available)',
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
        'Bengaluru', // Main Branch
        'Peenya', // Sub Branch
        'Innovate Inc.', // Customer Name
        'PO-2024-001', // PO Number
        '2024-03-15', // PO Date
        'SO-2024-001', // SO Number
        '2024-03-16', // SO Date
        'QT-2024-100', // Quote Number
        '123 Industrial Area', // Billing Address
        '29ABCDE1234F1Z5', // Bill To GSTIN
        '456 Warehouse Rd', // Shipping Address
        '29ABCDE1234F1Z5', // Ship To GSTIN
        'HAMMER-01', // Item Name
        'Hardware', // Item Type
        'Heavy Duty Hammer', // Item Description
        '10', // Quantity
        '100.00', // Unit Price
        '0.00', // Discount Amount
        '18', // GST Percentage
        'Available', // Stock Status
        'Available', // Item Status
        '', // OA Number
        '', // OA Date
        'Credit', // Sale Type
        '30', // Credit Terms
        'Open Orders', // Order Status
        'Fully Available', // Fulfillment Status
        'FALSE', // P & F Available
        'FALSE', // B
        'FALSE', // C
        'FALSE', // D
        'FALSE', // Battery
        'FALSE', // Spares
        'FALSE', // BD
        'FALSE', // Radiator Descaling
        'FALSE', // Others
        '' // Remarks
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
