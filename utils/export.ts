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
        'po_no', 'po_date', 'so_no', 'so_date', 'invoice_date', // Document Details
        'account_name', 'main_branch', 'sub_branch', // Customer & Branch
        'sale_type', 'credit_terms', 'order_status', 'fulfillment_status', // Payment & Status
        'pf_available', 'checklist_b', 'checklist_c', 'checklist_d', 'checklist_others', 'checklist_remarks', // Additional Details
        'part_number', 'item_description', 'quantity', 'rate', 'discount', 'gst_percentage', // Item Details
        'stock_status', 'oa_no', 'oa_date' // Item Stock Details
    ];
    const exampleRow1 = [
        'PO-12345', '2024-08-15', 'SO-54321', '2024-08-16', '',
        'Innovate Inc.', 'Bengaluru', 'Peenya',
        'Credit', '30', 'Pending', 'Fully Available',
        'TRUE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', '',
        'PART-XYZ-001', 'Description for item XYZ', '50', '250.75', '100', '18',
        'Available', '', ''
    ];
    // Example for a second item in the same PO (note PO details are duplicated)
    const exampleRow2 = [
        'PO-12345', '2024-08-15', 'SO-54321', '2024-08-16', '',
        'Innovate Inc.', 'Bengaluru', 'Peenya',
        'Credit', '30', 'Pending', 'Fully Available',
        'TRUE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', '',
        'PART-ABC-002', 'Description for item ABC', '20', '500.00', '0', '18',
        'Unavailable', 'OA-987', '2024-08-20'
    ];
    
    const csvContent = [
        headers.join(','), 
        exampleRow1.join(','),
        exampleRow2.join(',')
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    // Fix: Corrected the call to create an object URL. It should be `URL.createObjectURL`.
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};