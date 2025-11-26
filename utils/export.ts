
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
        'OA Number',
        'OA Date (YYYY-MM-DD)',
        'Sale Type (Cash/Credit)',
        'Credit Terms (Days)',
        'Order Status',
        'Fulfillment Status',
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
        '', // OA Number
        '', // OA Date
        'Credit', // Sale Type
        '30', // Credit Terms
        'Open Orders', // Order Status
        'New', // Fulfillment Status
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
