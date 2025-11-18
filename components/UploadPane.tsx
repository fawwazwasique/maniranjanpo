
import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentPlusIcon, PlusIcon, XMarkIcon, ArrowDownTrayIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';
import { downloadTemplate } from '../utils/export';

interface UploadPaneProps {
    onSaveSingleOrder: (order: any) => void;
    onBulkUpload: (files: FileList) => void;
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
};

const initialOrderState = {
    mainBranch: '',
    subBranch: '',
    accountName: '',
    poNo: '',
    poDate: new Date().toISOString().split('T')[0],
    soNo: '',
    soDate: new Date().toISOString().split('T')[0],
    invoiceDate: '',
    items: [initialItemState],
    orderStatus: 'Pending',
    fulfillmentStatus: 'Fully Available',
    saleType: 'Credit' as 'Cash' | 'Credit',
    creditTerms: 30,
    pfAvailable: false,
    checklist: {
        bCheck: false,
        cCheck: false,
        dCheck: false,
        others: false,
    },
    checklistRemarks: '',
};

const UploadPane: React.FC<UploadPaneProps> = ({ onSaveSingleOrder, onBulkUpload }) => {
    const [dragging, setDragging] = useState(false);
    const [order, setOrder] = useState(initialOrderState);

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
        const newItems = [...order.items];
        (newItems[index] as any)[name] = value;
        setOrder(prev => ({ ...prev, items: newItems }));
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
            
            acc.netTaxableValue += netTaxable;
            acc.gst += gstAmount;
            acc.totalAmount += total;
            
            return acc;
        }, { netTaxableValue: 0, gst: 0, totalAmount: 0 });
    }, [order.items]);


    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onBulkUpload(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, [onBulkUpload]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onBulkUpload(e.target.files);
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
                            {renderField("Invoice Date", "invoiceDate", "date")}
                            
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
                                     {order.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 mb-1"><XMarkIcon className="w-5 h-5"/></button>}
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
                                        <div className="flex gap-4 mt-1"><label className="flex items-center gap-2"><input type="radio" name="stockStatus" value="Available" checked={item.stockStatus === 'Available'} onChange={(e) => handleItemChange(index, e)} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Available</label><label className="flex items-center gap-2"><input type="radio" name="stockStatus" value="Unavailable" checked={item.stockStatus === 'Unavailable'} onChange={(e) => handleItemChange(index, e)} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Unavailable</label></div>
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
                           <p className="text-lg">Net Taxable Value: <span className="font-semibold text-slate-800 dark:text-slate-100">{totals.netTaxableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-lg">GST: <span className="font-semibold text-slate-800 dark:text-slate-100">{totals.gst.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
                           <p className="text-2xl font-bold">Total Amount: <span className="text-red-600 dark:text-red-400">{totals.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span></p>
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
                                    <select id="orderStatus" name="orderStatus" value={order.orderStatus} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">{['Pending', 'Invoiced', 'Shipped'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div>
                                    <label htmlFor="fulfillmentStatus" className="block text-sm font-medium">Fulfillment Status</label>
                                    <select id="fulfillmentStatus" name="fulfillmentStatus" value={order.fulfillmentStatus} onChange={handleOrderChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white">{['Fully Available', 'Partially Available'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                           </div>
                           <div className="md:col-span-2 pt-4 mt-2 border-t dark:border-slate-700 space-y-2">
                                <h3 className="text-lg font-medium text-slate-800 dark:text-white">Additional Details</h3>
                                <div className="flex items-center gap-4"><label className="flex items-center gap-2 font-medium"><input type="checkbox" name="pfAvailable" checked={order.pfAvailable} onChange={handleOrderChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> P & F Available</label></div>
                                <div>
                                    <label className="block text-sm font-medium">Checklist</label>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1"><label className="flex items-center gap-2"><input type="checkbox" name="bCheck" checked={order.checklist.bCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> B-Check</label><label className="flex items-center gap-2"><input type="checkbox" name="cCheck" checked={order.checklist.cCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> C-Check</label><label className="flex items-center gap-2"><input type="checkbox" name="dCheck" checked={order.checklist.dCheck} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> D-Check</label><label className="flex items-center gap-2"><input type="checkbox" name="others" checked={order.checklist.others} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Others</label></div>
                                    {order.checklist.others && (
                                        <div className="mt-3">
                                            <label htmlFor="checklistRemarks" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Remarks for "Others"</label>
                                            <input
                                                type="text"
                                                id="checklistRemarks"
                                                name="checklistRemarks"
                                                value={order.checklistRemarks || ''}
                                                onChange={handleOrderChange}
                                                placeholder="Enter remarks..."
                                                className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                                            />
                                        </div>
                                    )}
                                </div>
                           </div>
                        </div>

                        <div className="pt-4 border-t dark:border-slate-700">
                             <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <PlusIcon className="w-5 h-5" />
                                Save Order
                            </button>
                        </div>

                    </form>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                        <ArrowUpTrayIcon className="w-7 h-7 text-red-500" />
                        <span>Bulk Upload POs</span>
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-400 mb-4">
                        Upload one or more PO files (e.g., CSV). The system will process them automatically. Make sure your file follows the template format.
                    </p>
                    <div className="mb-6">
                        <button
                            onClick={downloadTemplate}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download Template
                        </button>
                    </div>
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragging ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'}`}
                    >
                        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400"/>
                        <p className="mt-2 block text-base font-medium text-slate-900 dark:text-white">
                            Drag & drop CSV files here
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">or</p>
                         <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500">
                           <span>Select files</span>
                           <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileSelect} accept=".csv" />
                        </label>
                    </div>
                     <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        <p><strong>Note:</strong> Bulk upload is a demo feature. Uploaded files will generate mock POs for demonstration purposes.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPane;