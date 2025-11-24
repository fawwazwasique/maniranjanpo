
import { PurchaseOrder } from '../types';

const convertToCSV = (data: PurchaseOrder[]): string => {
    const headers = [
        'ID', 'PO Number', 'Customer Name', 'PO Date', 'Main Branch', 'Sub Branch',
        'Status', 'Order Status', 'Fulfillment Status', 'Total Value', 'Sale Type', 'Payment Status',
        'Credit Terms', 'Created At'
    ];
    
    const rows = data.map(po => {
        const totalValue = po.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        return [
            po.id,
            po.poNumber,
            `"${po.customerName.replace(/"/g, '""')}"`,
            po.poDate,
            po.mainBranch || '',
            po.subBranch || '',
            po.status,
            po.orderStatus || '',
            po.fulfillmentStatus || '',
            totalValue,
            po.saleType,
            po.paymentStatus || '',
            po.creditTerms,
            po.createdAt
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

export const exportToCSV = (data: PurchaseOrder[], filename: string = 'purchase_orders.csv'): void => {
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
        'Dates',
        'Account Name',
        'Customer PO Reference No',
        'Item: Item Type',
        'Item: Item Name',
        'Item: Item Description',
        'Quantity',
        'Stock Available',
        'Stock In Hand',
        'Unit Price',
        'Base Amount',
        'Discount Amount',
        'Tax Amount',
        'Gross Amount',
        'Remarks',
        'Billing Address',
        'Bill To GSTIN',
        'Shipping Address',
        'Ship To GSTIN',
        'Quote Number',
        'Status',
        'Order Status'
    ];
    
    // Example data row matching the headers requested by the user
    const exampleRow = [
        'Bengaluru', // Branch
        'SO-2024-001', // Sale Order Number
        '2024-03-15', // Dates (PO Date)
        'Innovate Inc.', // Account Name
        'PO-REF-001', // Customer PO Reference No
        'Hardware', // Item: Item Type
        'HAMMER-01', // Item: Item Name
        'Heavy Duty Hammer', // Item: Item Description
        '10', // Quantity
        '50', // Stock Available
        '50', // Stock In Hand
        '100.00', // Unit Price
        '1000.00', // Base Amount
        '0.00', // Discount Amount
        '180.00', // Tax Amount
        '1180.00', // Gross Amount
        'Urgent Delivery', // Remarks
        '123 Industrial Area, Bengaluru', // Billing Address
        '29ABCDE1234F1Z5', // Bill To GSTIN
        '456 Warehouse Rd, Bengaluru', // Shipping Address
        '29ABCDE1234F1Z5', // Ship To GSTIN
        'QT-2024-100', // Quote Number
        'Open', // Status
        'Draft' // Order Status
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
