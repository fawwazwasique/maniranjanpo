import React, { useState } from 'react';
import { Quotation, QuotationItem } from '../types';
import { CUSTOMERS } from '../constants';
import { PlusIcon, XMarkIcon } from './icons';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quotation: Omit<Quotation, 'id' | 'createdAt'>) => void;
}

const QuotationModal: React.FC<QuotationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [customerName, setCustomerName] = useState('');
  const [validity, setValidity] = useState('30 Days');
  const [items, setItems] = useState<QuotationItem[]>([{ partNumber: '', quantity: 1, rate: 0 }]);

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    (item[field] as any) = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { partNumber: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.some(item => !item.partNumber || item.quantity <= 0 || item.rate <= 0)) {
        alert("Please fill all required fields, including valid item details.");
        return;
    }
    onSave({ customerName, validity, items });
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setCustomerName('');
    setValidity('30 Days');
    setItems([{ partNumber: '', quantity: 1, rate: 0 }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">New Quotation</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
                <select id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                    <option value="" disabled>Select a customer</option>
                    {CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="validity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Validity</label>
                <input type="text" id="validity" value={validity} onChange={e => setValidity(e.target.value)} required className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/>
              </div>
            </div>

            <h3 className="text-lg font-medium text-slate-800 dark:text-white pt-4 border-t dark:border-slate-700">Items</h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="text-xs text-slate-500">Part Number</label>
                    <input type="text" placeholder="Part Number" value={item.partNumber} onChange={e => handleItemChange(index, 'partNumber', e.target.value)} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="text-xs text-slate-500">Quantity</label>
                    <input type="number" placeholder="Quantity" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                     <label className="text-xs text-slate-500">Rate</label>
                    <input type="number" placeholder="Rate" min="0.01" step="0.01" value={item.rate} onChange={e => handleItemChange(index, 'rate', parseFloat(e.target.value))} required className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/>
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                        <XMarkIcon className="w-5 h-5"/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
              <PlusIcon className="w-5 h-5"/> Add Item
            </button>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Save Quotation</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationModal;