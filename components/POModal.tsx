
import React, { useState, useEffect } from 'react';
import type { PurchaseOrder, POItem, LogEntry } from '../types';
import { POItemStatus, OrderStatus, FulfillmentStatus } from '../types';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';
import { PlusIcon, XMarkIcon, SparklesIcon, ChevronDownIcon } from './icons';

interface POModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'status'>) => void;
  onUpdate?: (po: PurchaseOrder) => void;
  onUpdateItemStatus?: (poId: string, partNumber: string, status: POItemStatus) => void;
  existingPO?: PurchaseOrder;
  logs?: LogEntry[];
  onGetSuggestion?: (item: POItem) => void;
}

const initialItemState: POItem = { 
    partNumber: '', 
    quantity: 1, 
    rate: 0, 
    status: POItemStatus.NotAvailable, 
    itemDesc: '', 
    discount: 0, 
    gst: 0,
    stockAvailable: 0,
    stockInHand: 0,
    allocatedQuantity: 0,
    deliveryQuantity: 0,
    invoicedQuantity: 0,
    itemType: '',
};

const initialPOState: Omit<PurchaseOrder, 'id' | 'createdAt' | 'status'> = {
    poNumber: '',
    customerName: '',
    poDate: new Date().toISOString().split('T')[0],
    items: [initialItemState],
    saleType: 'Credit',
    paymentStatus: null,
    paymentNotes: '',
    creditTerms: 30,
    mainBranch: '',
    subBranch: '',
    salesOrderNumber: '',
    systemRemarks: '',
    orderStatus: OrderStatus.OpenOrders,
    fulfillmentStatus: FulfillmentStatus.New,
    invoiceNumber: '',
    invoiceDate: '',
    billingAddress: '',
    billToGSTIN: '',
    shippingAddress: '',
    shipToGSTIN: '',
    quoteNumber: '',
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
};


const POModal: React.FC<POModalProps> = ({ isOpen, onClose, onSave, onUpdate, onUpdateItemStatus, existingPO, logs = [], onGetSuggestion }) => {
  const [formData, setFormData] = useState(initialPOState);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  const isCreateMode = !existingPO;

  useEffect(() => {
    if (isOpen && existingPO) {
        setFormData({ 
            ...existingPO,
            // Ensure nested objects are initialized even if missing in old data
            checklist: {
                bCheck: existingPO.checklist?.bCheck || false,
                cCheck: existingPO.checklist?.cCheck || false,
                dCheck: existingPO.checklist?.dCheck || false,
                battery: existingPO.checklist?.battery || false,
                spares: existingPO.checklist?.spares || false,
                bd: existingPO.checklist?.bd || false,
                radiatorDescaling: existingPO.checklist?.radiatorDescaling || false,
                others: existingPO.checklist?.others || false,
            }
        });
    } else if (isOpen && !existingPO) {
        setFormData(initialPOState);
    }
    // Reset dropdown state when modal opens/closes
    setActiveDropdownIndex(null);
  }, [isOpen, existingPO]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checkedValue = (e.target as HTMLInputElement).checked;

    if (name === 'mainBranch') {
        setFormData(prev => ({ ...prev, mainBranch: value, subBranch: '' }));
    } else if (name === 'pfAvailable') {
        setFormData(prev => ({ ...prev, pfAvailable: checkedValue }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        checklist: { ...prev.checklist!, [name]: checked }
    }));
  };
  
  const handleSaleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const saleType = e.target.value as 'Cash' | 'Credit';
    setFormData(prev => ({
        ...prev,
        saleType,
        paymentStatus: saleType === 'Cash' ? 'Pending' : null,
        creditTerms: saleType === 'Credit' ? 30 : 0
    }));
  };

  const handleItemChange = (index: number, field: keyof POItem, value: string | number) => {
    setFormData(prev => {
        const newItems = prev.items.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({...prev, items: [...prev.items, initialItemState]}));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== index)}));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateMode && onSave) {
        onSave(formData);
    } else if (!isCreateMode && onUpdate && existingPO) {
        onUpdate({ ...formData, id: existingPO.id, createdAt: existingPO.createdAt, status: existingPO.status });
    }
    onClose();
  };

  const getStatusColor = (status: POItemStatus) => {
    const colors: { [key in POItemStatus]: string } = {
        [POItemStatus.Available]: 'text-green-600 dark:text-green-400',
        [POItemStatus.PartiallyAvailable]: 'text-yellow-600 dark:text-yellow-400',
        [POItemStatus.NotAvailable]: 'text-red-600 dark:text-red-400',
        [POItemStatus.Dispatched]: 'text-blue-600 dark:text-blue-400',
    };
    return colors[status];
  }

  const showInvoiceFields = formData.orderStatus === OrderStatus.Invoiced || formData.orderStatus === OrderStatus.PartiallyInvoiced || formData.orderStatus === OrderStatus.ShippedInSystemDC;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isCreateMode ? 'New Purchase Order' : `PO Details: ${existingPO.poNumber}`}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6">
                <div className="space-y-6">
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">PO Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer Name</label>
                                <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleInputChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                             <div>
                                <label htmlFor="mainBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Main Branch</label>
                                <select id="mainBranch" name="mainBranch" value={formData.mainBranch} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                                    <option value="">Select Main Branch</option>
                                    {MAIN_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="poNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">PO Number</label>
                                <input type="text" id="poNumber" name="poNumber" value={formData.poNumber} onChange={handleInputChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                             <div>
                                <label htmlFor="subBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Branch</label>
                                <select id="subBranch" name="subBranch" value={formData.subBranch} onChange={handleInputChange} disabled={!formData.mainBranch} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:opacity-50">
                                    <option value="">Select Sub Branch</option>
                                    {formData.mainBranch && BRANCH_STRUCTURE[formData.mainBranch]?.map(sb => <option key={sb} value={sb}>{sb}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="poDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">PO Date</label>
                                <input type="date" id="poDate" name="poDate" value={formData.poDate} onChange={handleInputChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                             <div>
                                <label htmlFor="orderStatus" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Order Status</label>
                                <select id="orderStatus" name="orderStatus" value={formData.orderStatus} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        {showInvoiceFields && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
                                <div>
                                    <label htmlFor="invoiceNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Number</label>
                                    <input type="text" id="invoiceNumber" name="invoiceNumber" value={formData.invoiceNumber || ''} onChange={handleInputChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-yellow-500 focus:border-yellow-500"/>
                                </div>
                                <div>
                                    <label htmlFor="invoiceDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Date</label>
                                    <input type="date" id="invoiceDate" name="invoiceDate" value={formData.invoiceDate || ''} onChange={handleInputChange} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-yellow-500 focus:border-yellow-500"/>
                                </div>
                            </div>
                        )}

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="salesOrderNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sales Order No.</label>
                                <input type="text" id="salesOrderNumber" name="salesOrderNumber" value={formData.salesOrderNumber} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                            <div>
                                <label htmlFor="fulfillmentStatus" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fulfillment Status</label>
                                <select id="fulfillmentStatus" name="fulfillmentStatus" value={formData.fulfillmentStatus} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                                    {Object.values(FulfillmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                         <div className="grid grid-cols-1 gap-4">
                             <div>
                                <label htmlFor="quoteNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Quote Number</label>
                                <input type="text" id="quoteNumber" name="quoteNumber" value={formData.quoteNumber || ''} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                             </div>
                         </div>
                    </div>
                    <div className="space-y-4 pt-6 border-t dark:border-slate-700">
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Items</h3>
                        {formData.items.map((item, index) => (
                          <div key={index} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex justify-between">
                               <input type="text" placeholder="Item Name / Part Number" value={item.partNumber} onChange={e => handleItemChange(index, 'partNumber', e.target.value)} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                               {formData.items.length > 1 && (<button type="button" onClick={() => removeItem(index)} className="ml-2 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><XMarkIcon className="w-5 h-5"/></button>)}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" placeholder="Item Type" value={item.itemType || ''} onChange={e => handleItemChange(index, 'itemType', e.target.value)} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <textarea placeholder="Item Description" value={item.itemDesc} onChange={e => handleItemChange(index, 'itemDesc', e.target.value)} rows={1} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Rate" min="0.01" step="0.01" value={item.rate} onChange={e => handleItemChange(index, 'rate', parseFloat(e.target.value))} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Discount" min="0" step="0.01" value={item.discount} onChange={e => handleItemChange(index, 'discount', parseFloat(e.target.value))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="GST %" min="0" step="0.01" value={item.gst} onChange={e => handleItemChange(index, 'gst', parseFloat(e.target.value))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <input type="number" placeholder="Stock Avail." value={item.stockAvailable} onChange={e => handleItemChange(index, 'stockAvailable', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Stock InHand" value={item.stockInHand} onChange={e => handleItemChange(index, 'stockInHand', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Allocated Qty" value={item.allocatedQuantity} onChange={e => handleItemChange(index, 'allocatedQuantity', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Delivery Qty" value={item.deliveryQuantity} onChange={e => handleItemChange(index, 'deliveryQuantity', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                                <input type="number" placeholder="Invoiced Qty" value={item.invoicedQuantity} onChange={e => handleItemChange(index, 'invoicedQuantity', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><PlusIcon className="w-5 h-5"/> Add Item</button>
                    </div>
                </div>

                <div className="space-y-6 mt-6 md:mt-0">
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Payment & Sale Type</h3>
                        <div role="radiogroup" className="flex gap-4">
                            <label className="flex items-center gap-2"><input type="radio" name="saleType" value="Credit" checked={formData.saleType === 'Credit'} onChange={handleSaleTypeChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Credit</label>
                            <label className="flex items-center gap-2"><input type="radio" name="saleType" value="Cash" checked={formData.saleType === 'Cash'} onChange={handleSaleTypeChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300"/> Cash</label>
                        </div>
                        {formData.saleType === 'Credit' && (
                           <div><label htmlFor="creditTerms" className="block text-sm font-medium">Credit Terms (days)</label><input type="number" id="creditTerms" name="creditTerms" value={formData.creditTerms} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/></div>
                        )}
                        {formData.saleType === 'Cash' && (
                            <div className="space-y-4">
                                <div><label htmlFor="paymentStatus" className="block text-sm font-medium">Payment Status</label><select id="paymentStatus" name="paymentStatus" value={formData.paymentStatus || ''} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"><option value="Pending">Pending</option><option value="Received">Received</option></select></div>
                            </div>
                        )}
                         <div><label htmlFor="systemRemarks" className="block text-sm font-medium">System Remarks / Notes</label><textarea id="systemRemarks" name="systemRemarks" value={formData.systemRemarks} onChange={handleInputChange} rows={2} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"></textarea></div>
                    </div>
                    
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Addresses & GSTIN</h3>
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="billingAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Billing Address</label>
                                <textarea id="billingAddress" name="billingAddress" value={formData.billingAddress || ''} onChange={handleInputChange} rows={2} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"></textarea>
                            </div>
                            <div>
                                <label htmlFor="billToGSTIN" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bill To GSTIN</label>
                                <input type="text" id="billToGSTIN" name="billToGSTIN" value={formData.billToGSTIN || ''} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                            <div>
                                <label htmlFor="shippingAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Shipping Address</label>
                                <textarea id="shippingAddress" name="shippingAddress" value={formData.shippingAddress || ''} onChange={handleInputChange} rows={2} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"></textarea>
                            </div>
                            <div>
                                <label htmlFor="shipToGSTIN" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ship To GSTIN</label>
                                <input type="text" id="shipToGSTIN" name="shipToGSTIN" value={formData.shipToGSTIN || ''} onChange={handleInputChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Additional Details</h3>
                        <div className="flex items-center gap-4"><label className="flex items-center gap-2 font-medium"><input type="checkbox" name="pfAvailable" checked={formData.pfAvailable || false} onChange={handleInputChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> P & F Available</label></div>
                        <div>
                            <label className="block text-sm font-medium">Checklist</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                                <label className="flex items-center gap-2"><input type="checkbox" name="bCheck" checked={formData.checklist?.bCheck || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> B-Check</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="cCheck" checked={formData.checklist?.cCheck || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> C-Check</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="dCheck" checked={formData.checklist?.dCheck || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> D-Check</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="battery" checked={formData.checklist?.battery || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Battery</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="spares" checked={formData.checklist?.spares || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Spares</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="bd" checked={formData.checklist?.bd || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> BD</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="radiatorDescaling" checked={formData.checklist?.radiatorDescaling || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Radiator Descaling</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="others" checked={formData.checklist?.others || false} onChange={handleChecklistChange} className="focus:ring-red-500 h-4 w-4 text-red-600 border-slate-300 rounded"/> Others</label>
                            </div>
                            {formData.checklist?.others && (
                                <div className="mt-3">
                                    <label htmlFor="checklistRemarks" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Remarks for "Others"</label>
                                    <input
                                        type="text"
                                        id="checklistRemarks"
                                        name="checklistRemarks"
                                        value={formData.checklistRemarks || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter remarks..."
                                        className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {!isCreateMode && (
                        <>
                         <div className="space-y-3 pt-6 border-t dark:border-slate-700">
                           <h3 className="text-lg font-medium text-slate-800 dark:text-white">Item Status</h3>
                           {formData.items.map((item, index) => (
                             <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                               <div className="flex justify-between items-center">
                                 <div>
                                   <p className="font-bold text-slate-800 dark:text-slate-100">{item.partNumber}</p>
                                   <p className={`text-sm font-semibold ${getStatusColor(item.status)}`}>{item.status}</p>
                                 </div>
                                 <div className="relative">
                                   <button 
                                     type="button" 
                                     onClick={() => setActiveDropdownIndex(activeDropdownIndex === index ? null : index)}
                                     className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"
                                   >
                                     Update <ChevronDownIcon className={`w-3 h-3 transition-transform ${activeDropdownIndex === index ? 'rotate-180' : ''}`}/>
                                   </button>
                                   
                                   {activeDropdownIndex === index && (
                                     <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                       {Object.values(POItemStatus).map(s => (
                                         <button 
                                           key={s} 
                                           type="button" 
                                           onClick={() => {
                                             onUpdateItemStatus?.(existingPO.id, item.partNumber, s);
                                             setActiveDropdownIndex(null);
                                           }} 
                                           className="block w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                                           disabled={item.status === s}
                                         >
                                           {s}
                                         </button>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               </div>
                               {item.status === POItemStatus.NotAvailable && onGetSuggestion && (<div className="mt-2 pt-2 border-t dark:border-slate-600"><button type="button" onClick={() => onGetSuggestion(item)} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/50 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900 w-full justify-center"><SparklesIcon className="w-3.5 h-3.5"/> Suggest Procurement Strategy</button></div>)}
                             </div>
                           ))}
                         </div>
                         <div className="space-y-3 pt-6 border-t dark:border-slate-700"><h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Activity Log</h3><ul className="space-y-3 max-h-48 overflow-y-auto pr-2">{logs.slice().reverse().map(log => (<li key={log.id} className="text-sm border-l-2 pl-3 border-slate-200 dark:border-slate-600"><p className="text-slate-700 dark:text-slate-200">{log.action}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</p></li>))}</ul></div>
                        </>
                    )}
                </div>
            </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">{isCreateMode ? 'Create PO' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default POModal;
