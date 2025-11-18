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
        'po_number', 'customer_name', 'po_date', 'main_branch', 'sub_branch', 
        'part_number', 'quantity', 'rate'
    ];
    const exampleRow = [
        'PO-12345', 'Innovate Inc.', '2024-08-15', 'Bengaluru', 'Peenya', 
        'PART-XYZ-001', '50', '250.75'
    ];
    
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
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