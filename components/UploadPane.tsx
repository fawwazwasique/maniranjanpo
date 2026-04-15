
import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentPlusIcon, PlusIcon, XMarkIcon, ArrowDownTrayIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE, BULK_UPLOAD_HEADERS, ITEM_CATEGORIES, SALE_TYPES, CUSTOMER_CATEGORIES, ZONES } from '../constants';
import { downloadTemplate } from '../utils/export';
import { OrderStatus, OverallPOStatus, FulfillmentStatus, POItemStatus, CustomerCategory, Zone } from '../types';
import { normalizeToAllowedValue, normalizeEnum } from '../utils/stringUtils';

interface UploadPaneProps {
    onSaveSingleOrder: (order: any) => void;
    onBulkUpload: (orders: any[]) => void;
}

const initialItemState = { 
    partNumber: '', 
    itemDesc: '', 
    itemType: '', 
    quantity: 1, 
    rate: 0, 
    discount: 0, 
    baseAmount: 0,
    taxAmount: 0,
    grossAmount: 0,
    category: '',
    itemRemarks: '',
    oaNo: '',
    oaDate: '',
    gst: 18,
    status: POItemStatus.NotAvailable,
};

const initialOrderState = {
    mainBranch: '',
    subBranch: '',
    customerName: '',
    poNumber: '',
    poDate: new Date().toISOString().split('T')[0],
    salesOrderNumber: '',
    soDate: new Date().toISOString().split('T')[0],
    status: OverallPOStatus.Available,
    orderStatus: OrderStatus.OpenOrders,
    generalRemarks: '',
    etaAvailable: '',
    billingPlan: '',
    materials: FulfillmentStatus.Available,
    invoiceNumber: '',
    invoiceDate: '',
    customerCategory: '' as any,
    zone: '' as any,
    items: [initialItemState],
    billingAddress: '',
    billToGSTIN: '',
    shippingAddress: '',
    shipToGSTIN: '',
    quoteNumber: '',
    saleType: 'Credit' as any,
    paymentStatus: null as 'Received' | 'Pending' | null,
    paymentNotes: '',
    creditTerms: 30,
    pfAvailable: false,
    checklist: {
        bCheck: false,
        cCheck: false,
        dCheck: false,
        battery: false,
        spares: false,
        bd: false,
        radiatorDescaling: false,
        others: false,
    },
    checklistRemarks: '',
    dispatchRemarks: '',
};

const UploadPane: React.FC<UploadPaneProps> = ({ onSaveSingleOrder, onBulkUpload }) => {
    const [dragging, setDragging] = useState(false);
    const [order, setOrder] = useState(initialOrderState);

    const parseCSVAndUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) {
                alert("The file appears to be empty or missing data rows.");
                return;
            }

            // Detect delimiter (comma, semicolon, or tab)
            const firstLine = lines[0];
            const delimiters = [',', ';', '\t'];
            let delimiter = ',';
            let maxCols = 0;
            delimiters.forEach(d => {
                const cols = firstLine.split(d).length;
                if (cols > maxCols) {
                    maxCols = cols;
                    delimiter = d;
                }
            });

            const rawHeaders = lines[0].split(delimiter);
            const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
            console.log("Detected delimiter:", delimiter);
            console.log("Parsed headers:", headers);
            
            const getColIdx = (exactHeader: string, aliases: string[] = []) => {
                const searchNames = [exactHeader, ...aliases].map(n => n.toLowerCase());
                const idx = headers.findIndex(h => searchNames.includes(h));
                if (idx === -1) {
                    // Try partial match as fallback
                    return headers.findIndex(h => searchNames.some(sn => h.includes(sn) || sn.includes(h)));
                }
                return idx;
            };

            const branchIdx = getColIdx('Main -Branch', ['Branch', 'Main Branch', 'Main-Branch']);
            const subBranchIdx = getColIdx('Sub - branch', ['Sub Branch', 'Sub-branch']);
            const accountIdx = getColIdx('Account Name', ['Cust Name', 'Customer Name', 'Account', 'Customer']);
            const soNoIdx = getColIdx('SO.NO', ['SO No', 'Sales Order Number', 'SO', 'SO Number']);
            const soDateIdx = getColIdx('SO DATE', ['SO Date', 'Sales Order Date']);
            const poNoIdx = getColIdx('PO.NO', ['PO No', 'Purchase Order Number', 'PO', 'PO Number']);
            const poDateIdx = getColIdx('PO DATE', ['PO Date', 'Purchase Order Date']);
            const poStatusIdx = getColIdx('Po Status', ['Status', 'PO Status', 'Overall Status']);
            const orderStatusIdx = getColIdx('Order Status', ['Current Status']);
            const saleTypeIdx = getColIdx('Sale Type', ['Payment Type']);
            const creditDaysIdx = getColIdx('Credit Days', ['Credit Terms', 'Terms']);
            const billPlanIdx = getColIdx('Billing Plan', ['Plan']);
            const materialsIdx = getColIdx('Materials', ['Fulfillment', 'Availability']);
            const etaIdx = getColIdx('Eta Available', ['ETA']);
            const genRemIdx = getColIdx('General Remarks', ['Remarks', 'Notes']);
            const invNoIdx = getColIdx('Invoice Number', ['Inv No', 'Invoice #']);
            const invDateIdx = getColIdx('Invoice Date', ['Inv Date']);
            const custCatIdx = getColIdx('Customer Category', ['Cust Cat']);
            const zoneIdx = getColIdx('Zone', ['Region']);
            
            const pfIdx = getColIdx('P & F Available', ['P&F', 'Packaging']);
            const bCheckIdx = getColIdx('B-Check');
            const cCheckIdx = getColIdx('C-Check');
            const dCheckIdx = getColIdx('D-Check');
            const batteryIdx = getColIdx('Battery');
            const sparesIdx = getColIdx('Spares');
            const bdIdx = getColIdx('BD');
            const radIdx = getColIdx('Radiator Descaling');
            const othersIdx = getColIdx('Others');
            const dispatchRemIdx = getColIdx('Dispatch Remarks', ['Pending Remarks']);
            
            const nameIdx = getColIdx('Item: Item Name', ['Item Name', 'Part Number', 'Item', 'Part #']);
            const typeIdx = getColIdx('Item: Item Type', ['Item Type', 'Type']);
            const catIdx = getColIdx('Category', ['Item Category']);
            const descIdx = getColIdx('Item: Item Description', ['Description', 'Item Description', 'Desc']);
            const qtyIdx = getColIdx('Quantity', ['Qty', 'Count']);
            const priceIdx = getColIdx('Unit Price', ['Rate', 'Price', 'Unit Rate']);
            const discIdx = getColIdx('Discount Amount', ['Discount', 'Disc']);
            const baseAmtIdx = getColIdx('Base Amount', ['Taxable Value']);
            const taxAmtIdx = getColIdx('Tax Amount', ['GST Amount']);
            const grossAmtIdx = getColIdx('Gross Amount', ['Total Amount', 'Grand Total']);
            const itemStatusIdx = getColIdx('Item Status', ['Line Status']);
            const oaNoIdx = getColIdx('Oa No', ['OA Number']);
            const oaDateIdx = getColIdx('Oa Date');
            const itemRemIdx = getColIdx('Item Remarks', ['Line Remarks']);

            const billAddrIdx = getColIdx('Billing Address', ['Bill To Address']);
            const billGstIdx = getColIdx('Bill To GSTIN', ['Billing GST']);
            const shipAddrIdx = getColIdx('Shipping Address', ['Ship To Address']);
            const shipGstIdx = getColIdx('Ship To GSTIN', ['Shipping GST']);
            const quoteIdx = getColIdx('Quote Number', ['Quotation No']);

            const rows = lines.slice(1).map(line => {
                const values: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (char === delimiter && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else current += char;
                }
                values.push(current.trim());
                return values;
            });

            console.log(`Parsed ${rows.length} rows from CSV.`);

            const getStr = (row: string[], idx: number, fallback = '') => (idx !== -1 && row[idx]) ? row[idx].trim() : fallback;
            const getNum = (row: string[], idx: number, fallback = 0) => (idx !== -1 && row[idx]) ? parseFloat(row[idx].replace(/[^0-9.]/g, '')) || fallback : fallback;
            const getBool = (row: string[], idx: number) => {
                if (idx === -1 || !row[idx]) return false;
                const v = row[idx].toLowerCase();
                return v === 'true' || v === 'yes' || v === '1' || v === 'checked';
            };

            const poGroups: Record<string, any[]> = {};
            rows.forEach(row => {
                const id = getStr(row, poNoIdx) || 'CSV-' + Math.random();
                if (!poGroups[id]) poGroups[id] = [];
                poGroups[id].push(row);
            });

            const parsedPOs = Object.entries(poGroups).map(([poNumber, group]) => {
                const first = group[0];
                
                const items = group.map(row => ({
                    partNumber: getStr(row, nameIdx, 'N/A'),
                    itemType: getStr(row, typeIdx),
                    category: normalizeToAllowedValue(getStr(row, catIdx), ITEM_CATEGORIES),
                    itemDesc: getStr(row, descIdx),
                    quantity: getNum(row, qtyIdx, 1),
                    rate: getNum(row, priceIdx),
                    discount: getNum(row, discIdx),
                    baseAmount: getNum(row, baseAmtIdx),
                    taxAmount: getNum(row, taxAmtIdx),
                    grossAmount: getNum(row, grossAmtIdx),
                    status: normalizeEnum(getStr(row, itemStatusIdx), POItemStatus) as POItemStatus || POItemStatus.NotAvailable,
                    oaNo: getStr(row, oaNoIdx),
                    oaDate: getStr(row, oaDateIdx),
                    itemRemarks: getStr(row, itemRemIdx),
                }));

                const rawSaleType = getStr(first, saleTypeIdx, 'Credit');
                const normalizedSaleType = normalizeToAllowedValue(rawSaleType, SALE_TYPES) as any;

                return {
                    mainBranch: normalizeToAllowedValue(getStr(first, branchIdx, 'Unassigned'), MAIN_BRANCHES),
                    subBranch: getStr(first, subBranchIdx),
                    customerName: getStr(first, accountIdx, 'Unknown'),
                    salesOrderNumber: getStr(first, soNoIdx),
                    soDate: getStr(first, soDateIdx),
                    poNumber: poNumber,
                    poDate: getStr(first, poDateIdx, new Date().toISOString().split('T')[0]),
                    status: normalizeEnum(getStr(first, poStatusIdx), OverallPOStatus) as OverallPOStatus || OverallPOStatus.Available,
                    orderStatus: normalizeEnum(getStr(first, orderStatusIdx), OrderStatus) as OrderStatus || OrderStatus.OpenOrders,
                    saleType: normalizedSaleType,
                    paymentStatus: (normalizedSaleType === 'Cash' || normalizedSaleType === 'Awaiting Payment') ? 'Pending' : null,
                    creditTerms: getNum(first, creditDaysIdx, 30),
                    billingPlan: getStr(first, billPlanIdx),
                    materials: normalizeEnum(getStr(first, materialsIdx), FulfillmentStatus) as FulfillmentStatus || FulfillmentStatus.Available,
                    fulfillmentStatus: normalizeEnum(getStr(first, materialsIdx), FulfillmentStatus) as FulfillmentStatus || FulfillmentStatus.Available,
                    invoiceNumber: getStr(first, invNoIdx),
                    invoiceDate: getStr(first, invDateIdx),
                    customerCategory: normalizeEnum(getStr(first, custCatIdx), CustomerCategory) as any,
                    zone: normalizeEnum(getStr(first, zoneIdx), Zone) as any,
                    etaAvailable: getStr(first, etaIdx),
                    generalRemarks: getStr(first, genRemIdx),
                    pfAvailable: getBool(first, pfIdx),
                    checklist: {
                        bCheck: getBool(first, bCheckIdx),
                        cCheck: getBool(first, cCheckIdx),
                        dCheck: getBool(first, dCheckIdx),
                        battery: getBool(first, batteryIdx),
                        spares: getBool(first, sparesIdx),
                        bd: getBool(first, bdIdx),
                        radiatorDescaling: getBool(first, radIdx),
                        others: getBool(first, othersIdx),
                    },
                    dispatchRemarks: getStr(first, dispatchRemIdx),
                    billingAddress: getStr(first, billAddrIdx),
                    billToGSTIN: getStr(first, billGstIdx),
                    shippingAddress: getStr(first, shipAddrIdx),
                    shipToGSTIN: getStr(first, shipGstIdx),
                    quoteNumber: getStr(first, quoteIdx),
                    items,
                    createdAt: new Date().toISOString()
                };
            });

            console.log(`Successfully parsed ${parsedPOs.length} Purchase Orders.`);
            if (parsedPOs.length === 0) {
                alert("No valid Purchase Orders were found in the CSV. Please check the column headers.");
                return;
            }

            onBulkUpload(parsedPOs);
        };
        reader.readAsText(file);
    };

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'mainBranch') {
            setOrder(prev => ({ ...prev, mainBranch: value, subBranch: '' }));
        } else if (name === 'saleType') {
            const saleType = value as any;
            setOrder(prev => ({ 
                ...prev, 
                saleType,
                paymentStatus: (saleType === 'Cash' || saleType === 'Awaiting Payment') ? 'Pending' : null,
                creditTerms: (saleType === 'Credit' || saleType === 'Amendment') ? 30 : 0 
            }));
        } else {
            setOrder(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOrder(prev => {
            const newItems = prev.items.map((item, i) => {
                if (i === index) {
                    return { ...item, [name]: value ?? '' };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };
    
    const addItem = () => {
        setOrder(prev => ({ ...prev, items: [...prev.items, { ...initialItemState }] }));
    };

    const removeItem = (index: number) => {
        setOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveSingleOrder(order);
        setOrder(initialOrderState);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            parseCSVAndUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            parseCSVAndUpload(e.target.files[0]);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
    
    const renderField = (label: string, name: string, type = 'text', options?: {value: string, label: string}[], required = false) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            {type === 'select' ? (
                <select id={name} name={name} value={(order as any)[name] || ''} onChange={handleOrderChange} required={required} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500">
                    <option value="">Select...</option>
                    {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            ) : (
                <input type={type} id={name} name={name} value={(order as any)[name] || ''} onChange={handleOrderChange} required={required} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500" />
            )}
        </div>
    );

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800 dark:text-white">
                        <DocumentPlusIcon className="w-8 h-8 text-red-500" />
                        <span>Manual Sales Order Entry</span>
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Header Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                            <div className="md:col-span-3"><h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 mb-2">Basic Information</h3></div>
                            {renderField("Main -Branch", "mainBranch", "select", MAIN_BRANCHES.map(b => ({value: b, label: b})), true)}
                            {renderField("Sub - branch", "subBranch", "select", order.mainBranch ? BRANCH_STRUCTURE[order.mainBranch].map(sb => ({value: sb, label: sb})) : [], true)}
                            {renderField("Cust Name", "customerName", "text", [], true)}
                            {renderField("SO No", "salesOrderNumber", "text", [], true)}
                            {renderField("SO Date", "soDate", "date", [], true)}
                            {renderField("PO No", "poNumber", "text", [], true)}
                            {renderField("PO Date", "poDate", "date", [], true)}
                            {renderField("PO Status", "status", "select", Object.values(OverallPOStatus).map(s => ({value: s, label: s})))}
                            {renderField("Order Status", "orderStatus", "select", Object.values(OrderStatus).map(s => ({value: s, label: s})))}
                            
                            <div>
                                <label htmlFor="saleType" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sale Type</label>
                                <select id="saleType" name="saleType" value={order.saleType || ''} onChange={handleOrderChange} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500">
                                    {SALE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            {order.saleType === 'Credit' && (
                                <div>
                                    <label htmlFor="creditTerms" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Credit Days</label>
                                    <input type="number" id="creditTerms" name="creditTerms" value={order.creditTerms ?? 0} onChange={handleOrderChange} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500" />
                                </div>
                            )}

                            {(order.saleType === 'Cash' || order.saleType === 'Awaiting Payment') && (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="paymentStatus" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Status</label>
                                        <select id="paymentStatus" name="paymentStatus" value={order.paymentStatus || ''} onChange={handleOrderChange} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500">
                                            <option value="Pending">Pending</option>
                                            <option value="Received">Received</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {renderField("Billing Plan", "billingPlan", "text")}
                            {renderField("Materials", "materials", "select", Object.values(FulfillmentStatus).map(s => ({value: s, label: s})))}
                            {renderField("Eta Available", "etaAvailable", "date")}
                            {renderField("Invoice Number", "invoiceNumber")}
                            {renderField("Invoice Date", "invoiceDate", "date")}
                            {renderField("Customer Category", "customerCategory", "select", CUSTOMER_CATEGORIES.map(c => ({value: c, label: c})))}
                            {renderField("Zone", "zone", "select", ZONES.map(z => ({value: z, label: z})))}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium">General Remarks</label>
                                <textarea name="generalRemarks" value={order.generalRemarks || ''} onChange={handleOrderChange} rows={2} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"></textarea>
                            </div>
                        </div>

                        {/* Additional Details Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                            <div className="md:col-span-2"><h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 mb-2">Additional Details & Checklist</h3></div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 font-medium">
                                    <input 
                                        type="checkbox" 
                                        name="pfAvailable" 
                                        checked={order.pfAvailable} 
                                        onChange={(e) => setOrder(prev => ({ ...prev, pfAvailable: e.target.checked }))} 
                                        className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"
                                    /> 
                                    P & F Available
                                </label>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Checklist</label>
                                <div className="flex flex-wrap gap-x-6 gap-y-3">
                                    {[
                                        { label: 'B-Check', name: 'bCheck' },
                                        { label: 'C-Check', name: 'cCheck' },
                                        { label: 'D-Check', name: 'dCheck' },
                                        { label: 'Battery', name: 'battery' },
                                        { label: 'Spares', name: 'spares' },
                                        { label: 'BD', name: 'bd' },
                                        { label: 'Radiator Descaling', name: 'radiatorDescaling' },
                                        { label: 'Others', name: 'others' },
                                    ].map(item => (
                                        <label key={item.name} className="flex items-center gap-2 text-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={(order.checklist as any)[item.name]} 
                                                onChange={(e) => setOrder(prev => ({
                                                    ...prev,
                                                    checklist: { ...prev.checklist, [item.name]: e.target.checked }
                                                }))}
                                                className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"
                                            />
                                            {item.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {order.checklist.others && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium">Checklist Remarks (for Others)</label>
                                    <input type="text" name="checklistRemarks" value={order.checklistRemarks || ''} onChange={handleOrderChange} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500" />
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium">Dispatch Pending Remarks</label>
                                <textarea name="dispatchRemarks" value={order.dispatchRemarks || ''} onChange={handleOrderChange} rows={2} className="mt-1 block w-full px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" placeholder="Reason for not shipping..."></textarea>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                           <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800 dark:text-white">Line Items</h3><button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-800"><PlusIcon className="w-5 h-5"/> Add Line Item</button></div>
                           {order.items.map((item, index) => (
                               <div key={index} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative space-y-4">
                                 {order.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><XMarkIcon className="w-6 h-6"/></button>}
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                     <div className="md:col-span-2"><label className="text-xs font-bold uppercase tracking-tight text-slate-500">Item: Item Name</label><input type="text" name="partNumber" value={item.partNumber || ''} onChange={(e) => handleItemChange(index, e)} required className="w-full text-base font-bold p-2 border-b-2 border-slate-200 focus:border-red-500 bg-transparent outline-none"/></div>
                                     <div><label className="text-xs font-bold uppercase tracking-tight text-slate-500">Item: Item Type</label><input type="text" name="itemType" value={item.itemType || ''} onChange={(e) => handleItemChange(index, e)} className="w-full text-base p-2 border-b border-slate-200 bg-transparent outline-none"/></div>
                                     <div>
                                        <label className="text-xs font-bold uppercase tracking-tight text-slate-500">Category</label>
                                        <select 
                                            name="category" 
                                            value={item.category || ''} 
                                            onChange={(e) => handleItemChange(index, e)} 
                                            className="w-full text-base p-2 border-b border-slate-200 bg-transparent outline-none dark:bg-slate-800 dark:text-white"
                                        >
                                            <option value="">Select Category</option>
                                            {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                     </div>
                                     <div className="md:col-span-4"><label className="text-xs font-bold uppercase tracking-tight text-slate-500">Item: Item Description</label><input type="text" name="itemDesc" value={item.itemDesc || ''} onChange={(e) => handleItemChange(index, e)} className="w-full text-base p-2 border-b border-slate-200 bg-transparent outline-none"/></div>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                     <div><label className="text-xs">Quantity</label><input type="number" name="quantity" value={item.quantity ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Unit Price</label><input type="number" name="rate" value={item.rate ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Discount Amount</label><input type="number" name="discount" value={item.discount ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Base Amount</label><input type="number" name="baseAmount" value={item.baseAmount ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Tax Amount</label><input type="number" name="taxAmount" value={item.taxAmount ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Gross Amount</label><input type="number" name="grossAmount" value={item.grossAmount ?? 0} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-red-50 font-bold rounded border-none"/></div>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className="text-xs">Item Status (Auto)</label>
                                        <div className="w-full p-2 bg-slate-100 dark:bg-slate-900 rounded border-none text-sm font-bold text-slate-500">
                                            {item.status}
                                        </div>
                                     </div>
                                     <div><label className="text-xs">Oa No</label><input type="text" name="oaNo" value={item.oaNo || ''} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                     <div><label className="text-xs">Oa Date</label><input type="date" name="oaDate" value={item.oaDate || ''} onChange={(e) => handleItemChange(index, e)} className="w-full p-2 bg-slate-50 rounded border-none"/></div>
                                 </div>
                                 <div><label className="text-xs font-bold text-slate-500">Item Remarks</label><input type="text" name="itemRemarks" value={item.itemRemarks || ''} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 border-b border-slate-200 bg-transparent outline-none"/></div>
                               </div>
                           ))}
                        </div>
                        
                        {/* Footer Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                           <div className="md:col-span-2"><h3 className="text-lg font-bold text-slate-800 dark:text-white border-b pb-2 mb-2">Delivery & Documentation</h3></div>
                           {renderField("Billing Address", "billingAddress")}
                           {renderField("Bill To GSTIN", "billToGSTIN")}
                           {renderField("Shipping Address", "shippingAddress")}
                           {renderField("Ship To GSTIN", "shipToGSTIN")}
                           {renderField("Quote Number", "quoteNumber")}
                        </div>

                        <div className="flex justify-end gap-3 pt-6">
                           <button type="button" onClick={() => setOrder(initialOrderState)} className="px-8 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Reset Form</button>
                           <button type="submit" className="px-12 py-3 text-sm font-black text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-xl active:scale-95 transition-all">Save Sales Order</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div 
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center p-12 rounded-xl transition-all ${dragging ? 'bg-red-50 border-red-500 scale-105' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent'}`}
                    >
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-6">
                            <ArrowUpTrayIcon className={`w-16 h-16 ${dragging ? 'text-red-600 animate-bounce' : 'text-slate-300'}`} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Bulk Import (CSV)</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-md">Drag and drop your spreadsheet here. The format must exactly match the 49 columns defined in the template.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-xl font-black transition-all active:scale-95">
                                <PlusIcon className="w-6 h-6" />
                                Choose CSV File
                                <input type="file" className="hidden" accept=".csv" onChange={handleFileSelect} />
                            </label>
                            <button onClick={downloadTemplate} className="flex items-center gap-3 px-8 py-4 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-black transition-all shadow-xl active:scale-95">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                                Download Master Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPane;
