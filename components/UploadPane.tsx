
import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentPlusIcon, PlusIcon, XMarkIcon, ArrowDownTrayIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';
import { downloadTemplate } from '../utils/export';
import { OrderStatus, OverallPOStatus, FulfillmentStatus, POItemStatus } from '../types';

interface UploadPaneProps {
    onSaveSingleOrder: (order: any) => void;
    onBulkUpload: (orders: any[]) => void;
}

const initialItemState = { 
    partNumber: '', 
    itemDesc: '', 
    quantity: 1, 
    rate: 0, 
    discount: 0, 
    gst: 18,
    stockAvailable: 0,
    stockInHand: 0,
    allocatedQuantity: 0,
    deliveryQuantity: 0,
    invoicedQuantity: 0,
    stockStatus: 'Available' as 'Available' | 'Unavailable',
    oaDate: '',
    oaNo: '',
    itemType: '',
};

const initialOrderState = {
    mainBranch: '',
    subBranch: '',
    accountName: '',
    poNo: '',
    poDate: new Date().toISOString().split('T')[0],
    soNo: '',
    soDate: new Date().toISOString().split('T')[0],
    items: [initialItemState],
    orderStatus: OrderStatus.OpenOrders,
    fulfillmentStatus: 'Fully Available',
    saleType: 'Credit' as 'Cash' | 'Credit',
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
    billingAddress: '',
    billToGSTIN: '',
    shippingAddress: '',
    shipToGSTIN: '',
    quoteNumber: '',
};

const UploadPane: React.FC<UploadPaneProps> = ({ onSaveSingleOrder, onBulkUpload }) => {
    const [dragging, setDragging] = useState(false);
    const [order, setOrder] = useState(initialOrderState);

    const parseCSVAndUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return;

            const rawHeaders = lines[0].split(',');
            const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
            
            const getColIdx = (searchTerms: string[]) => {
                for (const term of searchTerms) {
                    const idx = headers.indexOf(term.toLowerCase());
                    if (idx !== -1) return idx;
                }
                // Partial match fallback
                for (const term of searchTerms) {
                    const idx = headers.findIndex(h => h.includes(term.toLowerCase()));
                    if (idx !== -1) return idx;
                }
                return -1;
            };

            // Mapping to Template
            const branchIdx = getColIdx(['main branch', 'branch']);
            const subBranchIdx = getColIdx(['sub branch', 'zone']);
            const accountIdx = getColIdx(['account name', 'customer']);
            const poNoIdx = getColIdx(['po number', 'po no']);
            const poDateIdx = getColIdx(['po date']);
            const soNoIdx = getColIdx(['so number', 'so no', 'sale order']);
            const soDateIdx = getColIdx(['so date']);
            const quoteIdx = getColIdx(['quote number']);
            const billAddrIdx = getColIdx(['billing address']);
            const billGstIdx = getColIdx(['bill to gstin']);
            const shipAddrIdx = getColIdx(['shipping address']);
            const shipGstIdx = getColIdx(['ship to gstin']);
            const saleTypeIdx = getColIdx(['sale type']);
            const creditIdx = getColIdx(['credit terms']);
            const pfIdx = getColIdx(['p & f available']);
            
            // Checklist
            const bCheckIdx = getColIdx(['b-check']);
            const cCheckIdx = getColIdx(['c-check']);
            const dCheckIdx = getColIdx(['d-check']);
            const battIdx = getColIdx(['battery']);
            const spareIdx = getColIdx(['spares']);
            const bdIdx = getColIdx(['bd']);
            const radIdx = getColIdx(['radiator descaling']);
            const otherIdx = getColIdx(['others']);
            const checkRemarksIdx = getColIdx(['checklist remarks']);

            // Item Level
            const partIdx = getColIdx(['item name', 'part number']);
            const typeIdx = getColIdx(['item type']);
            const descIdx = getColIdx(['item description']);
            const qtyIdx = getColIdx(['quantity', 'qty']);
            const priceIdx = getColIdx(['unit price', 'rate']);
            const discountIdx = getColIdx(['discount']);
            const gstIdx = getColIdx(['gst']);
            const stockStatIdx = getColIdx(['stock status']);
            const oaNoIdx = getColIdx(['oa number', 'oa no']);
            const oaDateIdx = getColIdx(['oa date']);

            const rows = lines.slice(1).map(line => {
                const values: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else current += char;
                }
                values.push(current.trim());
                return values;
            });

            const getStr = (row: string[], idx: number, fallback = '') => (idx !== -1 && row[idx]) ? row[idx].trim() : fallback;
            const getBool = (row: string[], idx: number) => {
                if (idx === -1 || !row[idx]) return false;
                const v = row[idx].toLowerCase();
                return v === 'true' || v === 'yes' || v === '1';
            };

            // Group by PO Number for multi-item logic
            const poGroups: Record<string, any[]> = {};
            rows.forEach(row => {
                const id = getStr(row, poNoIdx) || 'MANUAL-' + Math.random();
                if (!poGroups[id]) poGroups[id] = [];
                poGroups[id].push(row);
            });

            const parsedPOs = Object.entries(poGroups).map(([poNumber, group]) => {
                const first = group[0];
                
                const items = group.map(row => ({
                    partNumber: getStr(row, partIdx, 'N/A'),
                    itemType: getStr(row, typeIdx),
                    itemDesc: getStr(row, descIdx),
                    quantity: parseFloat(getStr(row, qtyIdx)) || 0,
                    rate: parseFloat(getStr(row, priceIdx)) || 0,
                    discount: parseFloat(getStr(row, discountIdx)) || 0,
                    gst: parseFloat(getStr(row, gstIdx)) || 18,
                    status: getStr(row, stockStatIdx).toLowerCase().includes('avail') ? POItemStatus.Available : POItemStatus.NotAvailable,
                    oaNo: getStr(row, oaNoIdx),
                    oaDate: getStr(row, oaDateIdx),
                }));

                const saleType = getStr(first, saleTypeIdx) as 'Cash' | 'Credit' || 'Credit';

                return {
                    mainBranch: getStr(first, branchIdx, 'Unassigned'),
                    subBranch: getStr(first, subBranchIdx),
                    customerName: getStr(first, accountIdx, 'Unknown'),
                    poNumber: poNumber,
                    poDate: getStr(first, poDateIdx, new Date().toISOString().split('T')[0]),
                    salesOrderNumber: getStr(first, soNoIdx),
                    soDate: getStr(first, soDateIdx, new Date().toISOString().split('T')[0]),
                    quoteNumber: getStr(first, quoteIdx),
                    billingAddress: getStr(first, billAddrIdx),
                    billToGSTIN: getStr(first, billGstIdx),
                    shippingAddress: getStr(first, shipAddrIdx),
                    shipToGSTIN: getStr(first, shipGstIdx),
                    saleType: saleType,
                    creditTerms: parseInt(getStr(first, creditIdx)) || (saleType === 'Credit' ? 30 : 0),
                    pfAvailable: getBool(first, pfIdx),
                    checklist: {
                        bCheck: getBool(first, bCheckIdx),
                        cCheck: getBool(first, cCheckIdx),
                        dCheck: getBool(first, dCheckIdx),
                        battery: getBool(first, battIdx),
                        spares: getBool(first, spareIdx),
                        bd: getBool(first, bdIdx),
                        radiatorDescaling: getBool(first, radIdx),
                        others: getBool(first, otherIdx),
                    },
                    checklistRemarks: getStr(first, checkRemarksIdx),
                    items,
                    status: OverallPOStatus.Open,
                    fulfillmentStatus: FulfillmentStatus.Partial,
                    orderStatus: OrderStatus.OpenOrders,
                    createdAt: new Date().toISOString()
                };
            });

            onBulkUpload(parsedPOs);
        };
        reader.readAsText(file);
    };

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;

        if (name === 'mainBranch') {
            setOrder(prev => ({ ...prev, mainBranch: value, subBranch: '' }));
        } else {
            setOrder(prev => ({ ...prev, [name]: isCheckbox ? checkedValue : value }));
        }
    };

    const handleSaleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const saleType = e.target.value as 'Cash' | 'Credit';
        setOrder(prev => ({
            ...prev,
            saleType,
            creditTerms: saleType === 'Credit' ? 30 : 0,
        }));
    };

    const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setOrder(prev => ({
            ...prev,
            checklist: { ...prev.checklist, [name]: checked }
        }));
    };

    const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOrder(prev => {
            const newItems = prev.items.map((item, i) => {
                if (i === index) {
                    return { ...item, [name]: value };
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
    
    const totals = React.useMemo(() => {
        return order.items.reduce((acc, item) => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const gst = Number(item.gst) || 0;

            const unitExt = qty * rate;
            const netTaxable = unitExt - discount;
            const gstAmount = netTaxable * (gst / 100);
            const total = netTaxable + gstAmount;
            
            acc.grossValue += unitExt;
            acc.totalDiscount += discount;
            acc.netTaxableValue += netTaxable;
            acc.gst += gstAmount;
            acc.totalAmount += total;
            
            return acc;
        }, { grossValue: 0, totalDiscount: 0, netTaxableValue: 0, gst: 0, totalAmount: 0 });
    }, [order.items]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            parseCSVAndUpload(e.dataTransfer.files[0]);
        }
    }, [onBulkUpload]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            parseCSVAndUpload(e.target.files[0]);
        }
    };

    const renderField = (label: string, name: string, type = 'text', options?: {value: string, label: string}[], required = false) => {
        const commonProps = {
            id: name,
            name,
            required,
            className: "mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500",
            onChange: handleOrderChange,
        };

        return (
            <div>
                <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                {type === 'select' ? (
                    <select {...commonProps} value={(order as any)[name]}>
                        {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                ) : (
                    <input type={type} {...commonProps} value={(order as any)[name]} />
                )}
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                        <DocumentPlusIcon className="w-7 h-7 text-red-500" />
                        <span>Manual Sales Order Entry</span>
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <h3 className="md:col-span-2 text-lg font-medium text-slate-800 dark:text-white -mb-2">Document Details</h3>
                            {renderField("PO No.", "poNo", "text", [], true)}
                            {renderField("PO Date", "poDate", "date", [], true)}
                            {renderField("SO No.", "soNo", "text", [], true)}
                            {renderField("SO Date", "soDate", "date", [], true)}
                            {renderField("Quote Number", "quoteNumber", "text", [], false)}
                            
                            <h3 className="md:col-span-2 text-lg font-medium text-slate-800 dark:text-white pt-4 mt-2 border-t dark:border-slate-700 -mb-2">Customer & Branch</h3>
                            <div className="md:col-span-2">
                                {renderField("Account Name", "accountName", "text", [], true)}
                            </div>
                            <div>
                                <label htmlFor="mainBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Main Branch</label>
                                <select id="mainBranch" name="mainBranch" value={order.mainBranch} onChange={handleOrderChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                                    <option value="">Select Main Branch</option>
                                    {MAIN_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="subBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Branch</label>
                                <select id="subBranch" name="subBranch" value={order.subBranch} onChange={handleOrderChange} required disabled={!order.mainBranch} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:opacity-50">
                                    <option value="">Select Sub Branch</option>
                                    {order.mainBranch && BRANCH_STRUCTURE[order.mainBranch]?.map(sb => <option key={sb} value={sb}>{sb}</option>)}
                                </select>
                            </div>
                            
                            <h3 className="md:col-span-2 text-lg font-medium text-slate-800 dark:text-white pt-4 mt-2 border-t dark:border-slate-700 -mb-2">Addresses</h3>
                            {renderField("Billing Address", "billingAddress", "text", [], false)}
                            {renderField("Bill To GSTIN", "billToGSTIN", "text", [], false)}
                            {renderField("Shipping Address", "shippingAddress", "text", [], false)}
                            {renderField("Ship To GSTIN", "shipToGSTIN", "text", [], false)}
                        </div>

                        <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                           <h3 className="text-lg font-medium">Items</h3>
                           {order.items.map((item, index) => (
                               <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3 border border-slate-200 dark:border-slate-700">
                                 <div className="flex justify-between items-end gap-3">
                                     <div className="w-full">
                                        <label htmlFor={`partNumber-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                                        <input type="text" id={`partNumber-${index}`} name="partNumber" value={item.partNumber} onChange={(e) => handleItemChange(index, e)} required className="w-full text-base font-semibold px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                     </div>
                                     <div className="w-full">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Type</label>
                                        <input type="text" name="itemType" value={item.itemType} onChange={(e) => handleItemChange(index, e)} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                     </div>
                                     {order.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 mb-1"><XMarkIcon className="w-5 h-5"/></button>}
                                 </div>
                                 <div className="w-full">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Description</label>
                                    <input type="text" name="itemDesc" value={item.itemDesc} onChange={(e) => handleItemChange(index, e)} placeholder="Description" className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                     <div><label className="text-sm">Qty</label><input type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} required className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                     <div><label className="text-sm">Unit Price</label><input type="number" name="rate" step="0.01" value={item.rate} onChange={(e) => handleItemChange(index, e)} required className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                     <div><label className="text-sm">Discount Amt</label><input type="number" name="discount" step="0.01" value={item.discount} onChange={(e) => handleItemChange(index, e)} className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                     <div><label className="text-sm">GST %</label><input type="number" name="gst" value={item.gst} onChange={(e) => handleItemChange(index, e)} className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 items-end pt-3 border-t dark:border-slate-700">
                                    <div>
                                        <label className="block text-sm font-medium">Stock Status</label>
                                        <div className="flex gap-4 mt-1">
                                            <label className="flex items-center gap-2"><input type="radio" name={`stockStatus-${index}`} value="Available" checked={item.stockStatus === 'Available'} onChange={(e) => handleItemChange(index, { target: { name: 'stockStatus', value: 'Available' } } as any)} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Available</label>
                                            <label className="flex items-center gap-2"><input type="radio" name={`stockStatus-${index}`} value="Unavailable" checked={item.stockStatus === 'Unavailable'} onChange={(e) => handleItemChange(index, { target: { name: 'stockStatus', value: 'Unavailable' } } as any)} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Unavailable</label>
                                        </div>
                                    </div>
                                    {item.stockStatus === 'Unavailable' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-sm">OA No.</label><input type="text" name="oaNo" value={item.oaNo} onChange={(e) => handleItemChange(index, e)} className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                            <div><label className="text-sm">OA Date</label><input type="date" name="oaDate" value={item.oaDate} onChange={(e) => handleItemChange(index, e)} className="w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/></div>
                                        </div>
                                    )}
                                 </div>
                               </div>
                           ))}
                           <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><PlusIcon className="w-5 h-5"/> Add Item</button>
                        </div>
                        
                         <div className="space-y-1 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-right">
                           <p className="text-lg">Subtotal: <span className="font-semibold text-slate-800 dark:text-slate-100">{totals.grossValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-lg text-amber-600 dark:text-amber-400">Discount: <span className="font-semibold">{totals.totalDiscount > 0 ? '- ' : ''}{totals.totalDiscount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-lg">Net Taxable Value: <span className="font-semibold text-slate-800 dark:text-slate-100">{totals.netTaxableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-lg">GST: <span className="font-semibold text-slate-800 dark:text-slate-100">+ {totals.gst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-2xl font-bold pt-2 mt-2 border-t border-slate-300 dark:border-slate-700">Total Amount: <span className="text-red-600 dark:text-red-400">{totals.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                           <div>
                                <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">Payment</h3>
                                <div role="radiogroup" className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" name="saleType" value="Credit" checked={order.saleType === 'Credit'} onChange={handleSaleTypeChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Credit</label><label className="flex items-center gap-2"><input type="radio" name="saleType" value="Cash" checked={order.saleType === 'Cash'} onChange={handleSaleTypeChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Cash</label></div>
                                {order.saleType === 'Credit' && (
                                    <div className="mt-2"><label htmlFor="creditTerms" className="block text-sm font-medium">Credit Terms</label><select id="creditTerms" name="creditTerms" value={order.creditTerms} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500">{[...Array(30).keys()].map(i => <option key={i+1} value={i+1}>{i+1} days</option>)}</select></div>
                                )}
                           </div>
                           <div className="space-y-3">
                                <div>
                                    <label htmlFor="orderStatus" className="block text-sm font-medium">Order Status</label>
                                    <select id="orderStatus" name="orderStatus" value={order.orderStatus} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                                        {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="fulfillmentStatus" className="block text-sm font-medium">Fulfillment Status</label>
                                    <select id="fulfillmentStatus" name="fulfillmentStatus" value={order.fulfillmentStatus} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                                        {['Fully Available', 'Partially Available', 'Not Available'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                           </div>
                           <div className="md:col-span-2 pt-4 mt-2 border-t dark:border-slate-700 space-y-2">
                                <h3 className="text-lg font-medium text-slate-800 dark:text-white">Additional Details</h3>
                                <div className="flex items-center gap-4"><label className="flex items-center gap-2 font-medium"><input type="checkbox" name="pfAvailable" checked={order.pfAvailable} onChange={handleOrderChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> P & F Available</label></div>
                                <div>
                                    <label className="block text-sm font-medium">Checklist</label>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                                        <label className="flex items-center gap-2"><input type="checkbox" name="bCheck" checked={order.checklist.bCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> B-Check</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="cCheck" checked={order.checklist.cCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> C-Check</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="dCheck" checked={order.checklist.dCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> D-Check</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="battery" checked={order.checklist.battery} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Battery</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="spares" checked={order.checklist.spares} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Spares</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="bd" checked={order.checklist.bd} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> BD</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="radiatorDescaling" checked={order.checklist.radiatorDescaling} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Radiator Descaling</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" name="others" checked={order.checklist.others} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Others</label>
                                    </div>
                                    {order.checklist.others && (
                                        <div className="mt-3">
                                            <label htmlFor="checklistRemarks" className="block text-sm font-medium">Remarks for "Others"</label>
                                            <input type="text" id="checklistRemarks" name="checklistRemarks" value={order.checklistRemarks} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                                        </div>
                                    )}
                                </div>
                           </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t dark:border-slate-700">
                           <button type="button" onClick={() => setOrder(initialOrderState)} className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Reset</button>
                           <button type="submit" className="px-10 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-lg active:scale-95 transition-all">Save Order</button>
                        </div>
                    </form>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <div 
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center p-12 rounded-xl transition-all ${dragging ? 'bg-red-50 border-red-500 scale-105' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent'}`}
                    >
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-md mb-4">
                            <ArrowUpTrayIcon className={`w-12 h-12 ${dragging ? 'text-red-600 animate-bounce' : 'text-slate-400'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bulk Import (CSV)</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-center mb-6 max-w-sm">Drag and drop your sales order CSV here, or click to browse files from your computer.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-md font-bold transition-all active:scale-95">
                                <PlusIcon className="w-5 h-5" />
                                Choose File
                                <input type="file" className="hidden" accept=".csv" onChange={handleFileSelect} />
                            </label>
                            <button onClick={downloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-bold transition-all">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                Download Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPane;
