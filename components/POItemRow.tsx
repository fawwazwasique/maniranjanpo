
import React from 'react';
import { POItem } from '../types';
import { ITEM_CATEGORIES } from '../constants';
import { XMarkIcon } from './icons';

interface POItemRowProps {
  item: POItem;
  index: number;
  onItemChange: (index: number, field: keyof POItem, value: any) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}

const POItemRow: React.FC<POItemRowProps> = ({ item, index, onItemChange, onRemove, showRemove }) => {
  return (
    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <div className="flex justify-between">
        <input 
          type="text" 
          placeholder="Item Name / Part Number" 
          value={item.partNumber || ''} 
          onChange={e => onItemChange(index, 'partNumber', e.target.value)} 
          required 
          className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
        {showRemove && (
          <button 
            type="button" 
            onClick={() => onRemove(index)} 
            className="ml-2 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
          >
            <XMarkIcon className="w-5 h-5"/>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select 
          value={item.category || ''} 
          onChange={e => onItemChange(index, 'category', e.target.value)} 
          className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        >
          <option value="">Select Category</option>
          {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <input 
          type="text" 
          placeholder="Item Type" 
          value={item.itemType || ''} 
          onChange={e => onItemChange(index, 'itemType', e.target.value)} 
          className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
      </div>
      <textarea 
        placeholder="Item Description" 
        value={item.itemDesc || ''} 
        onChange={e => onItemChange(index, 'itemDesc', e.target.value)} 
        rows={1} 
        className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500" 
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input 
          type="number" 
          placeholder="Qty" 
          min="1" 
          value={item.quantity ?? 0} 
          onChange={e => onItemChange(index, 'quantity', parseInt(e.target.value, 10))} 
          required 
          className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
        <input 
          type="number" 
          placeholder="Rate" 
          min="0.01" 
          step="0.01" 
          value={item.rate ?? 0} 
          onChange={e => onItemChange(index, 'rate', parseFloat(e.target.value))} 
          required 
          className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
        <input 
          type="number" 
          placeholder="Discount" 
          min="0" 
          step="0.01" 
          value={item.discount ?? 0} 
          onChange={e => onItemChange(index, 'discount', parseFloat(e.target.value))} 
          className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
        <input 
          type="number" 
          placeholder="GST %" 
          min="0" 
          step="0.01" 
          value={item.gst ?? 0} 
          onChange={e => onItemChange(index, 'gst', parseFloat(e.target.value))} 
          className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"
        />
      </div>
      
      <div className="mt-3 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Fulfillment Details</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Delivered</label>
            <input type="number" value={item.deliveryQuantity ?? 0} onChange={e => onItemChange(index, 'deliveryQuantity', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Invoiced</label>
            <input type="number" value={item.invoicedQuantity ?? 0} onChange={e => onItemChange(index, 'invoicedQuantity', parseInt(e.target.value, 10))} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Order Acknowledgement (OA) Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">OA Number</label>
            <input type="text" placeholder="Enter OA No" value={item.oaNo || ''} onChange={e => onItemChange(index, 'oaNo', e.target.value)} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">OA Date</label>
            <input type="date" placeholder="Select OA Date" value={item.oaDate || ''} onChange={e => onItemChange(index, 'oaDate', e.target.value)} className="w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500"/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POItemRow;
