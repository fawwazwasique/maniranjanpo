
import React, { useState, useMemo } from 'react';
import type { StockItem, PurchaseOrder, StockMovement, POItem } from '../types';
import { ArrowUpTrayIcon, TruckIcon, XMarkIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PlusIcon, CurrencyRupeeIcon, ClockIcon, ClipboardDocumentListIcon } from './icons';
import { downloadStockTemplate } from '../utils/export';

interface StockManagementPaneProps {
  stock: StockItem[];
  purchaseOrders: PurchaseOrder[];
  movements: StockMovement[];
  onInward: (partNumber: string, qty: number, remark: string) => Promise<void>;
  onWalkingSale: (partNumber: string, qty: number, remark: string) => Promise<void>;
  onAllocate: (poId: string, partNumber: string, qty: number) => Promise<void>;
  onRegisterPart: (partNumber: string, description: string, initialQty: number) => Promise<void>;
  onBulkStockUpload: (items: { partNumber: string; description: string; quantity: number }[]) => Promise<void>;
  onNavigateToReports?: () => void;
}

const StockManagementPane: React.FC<StockManagementPaneProps> = ({ 
    stock, purchaseOrders, movements, onInward, onWalkingSale, onAllocate, onRegisterPart, onBulkStockUpload, onNavigateToReports 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState<'inward' | 'walking' | 'allocate' | 'history' | 'registerPart' | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  
  // Search filter for PO allocation
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [formState, setFormState] = useState({ qty: 1, remark: '', poId: '', partNumber: '', description: '' });

  const filteredStock = useMemo(() => {
    return stock.filter(s => 
        (s.partNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stock, searchTerm]);

  const partHistory = useMemo(() => {
    if (!selectedPart) return [];
    return movements.filter(m => m.partNumber === selectedPart);
  }, [movements, selectedPart]);

  // Filters POs that need this part and matches the search query
  const targetPOsForPart = useMemo(() => {
    if (!selectedPart) return [];
    const normalizedPart = selectedPart.trim().toLowerCase();
    
    return purchaseOrders.filter(po => {
        const matchingItem = po.items.find(item => (item.partNumber || '').trim().toLowerCase() === normalizedPart);
        const needsAllocation = matchingItem ? (Number(matchingItem.quantity || 0) - Number(matchingItem.allocatedQuantity || 0)) > 0 : false;
        
        const matchesSearch = (po.poNumber || '').toLowerCase().includes(poSearchQuery.toLowerCase()) || 
                             (po.customerName || '').toLowerCase().includes(poSearchQuery.toLowerCase());
        
        return needsAllocation && matchesSearch;
    });
  }, [purchaseOrders, selectedPart, poSearchQuery]);

  const handlePOSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const poId = e.target.value;
    if (!poId) {
        setFormState(prev => ({ ...prev, poId: '', qty: 1 }));
        return;
    }

    const selectedPO = targetPOsForPart.find(p => p.id === poId);
    if (selectedPO && selectedPart) {
        const normalizedPart = selectedPart.trim().toLowerCase();
        const item = selectedPO.items.find(i => (i.partNumber || '').trim().toLowerCase() === normalizedPart);
        const neededQty = item ? (Number(item.quantity || 0) - Number(item.allocatedQuantity || 0)) : 1;
        
        setFormState(prev => ({ 
            ...prev, 
            poId, 
            qty: Math.max(1, neededQty) 
        }));
    } else {
        setFormState(prev => ({ ...prev, poId, qty: 1 }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const partIndex = headers.indexOf('part number');
          const descIndex = headers.indexOf('description');
          const qtyIndex = headers.indexOf('quantity');

          if (partIndex === -1 || qtyIndex === -1) {
              alert("Invalid CSV format. Header must contain 'Part Number' and 'Quantity'.");
              return;
          }

          const itemsToUpload = lines.slice(1).map(line => {
              const columns = line.split(',');
              return {
                  partNumber: columns[partIndex]?.trim() || '',
                  description: columns[descIndex]?.trim() || '',
                  quantity: parseInt(columns[qtyIndex]?.trim() || '0', 10)
              };
          }).filter(item => item.partNumber);

          if (itemsToUpload.length > 0) {
              await onBulkStockUpload(itemsToUpload);
              alert(`Successfully uploaded ${itemsToUpload.length} part records.`);
          }
      };
      reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeModal === 'registerPart') {
        await onRegisterPart(formState.partNumber, formState.description, formState.qty);
    } else if (selectedPart) {
        if (activeModal === 'inward') {
            await onInward(selectedPart, formState.qty, formState.remark);
        } else if (activeModal === 'walking') {
            await onWalkingSale(selectedPart, formState.qty, formState.remark);
        } else if (activeModal === 'allocate') {
            await onAllocate(formState.poId, selectedPart, formState.qty);
        }
    }
    closeModal();
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormState({ qty: 1, remark: '', poId: '', partNumber: '', description: '' });
    setPoSearchQuery('');
    setSelectedPart(null);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Inventory Control</h2>
          <p className="text-slate-500 dark:text-slate-400">Physical stock tracking, inward entries, and PO allocations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {onNavigateToReports && (
                <button 
                    onClick={onNavigateToReports}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm font-semibold border border-slate-300 dark:border-slate-600"
                >
                    <ClipboardDocumentListIcon className="w-5 h-5" /> Allocation Report
                </button>
            )}
            <button 
                onClick={() => setActiveModal('registerPart')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
            >
                <PlusIcon className="w-5 h-5" /> Register New Part
            </button>
            <button 
                onClick={downloadStockTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm font-semibold"
            >
                <ArrowDownTrayIcon className="w-5 h-5" /> Template
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-sm text-sm font-semibold">
                <ArrowUpTrayIcon className="w-5 h-5" />
                Bulk Inward CSV
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <div className="relative mb-6">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search parts inventory..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-red-500 focus:border-red-500 outline-none shadow-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 border-b dark:border-slate-700">Part Info</th>
                <th className="p-4 border-b dark:border-slate-700 text-right">Physical Total</th>
                <th className="p-4 border-b dark:border-slate-700 text-right">Allocated</th>
                <th className="p-4 border-b dark:border-slate-700 text-right">Net Available</th>
                <th className="p-4 border-b dark:border-slate-700 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {filteredStock.map(item => {
                const total = Number(item.totalQuantity || 0);
                const allocated = Number(item.allocatedQuantity || 0);
                const available = total - allocated;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white text-base">{item.partNumber || 'Unknown'}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-xs">{item.description || 'No description'}</p>
                    </td>
                    <td className="p-4 text-right font-medium text-lg">{total}</td>
                    <td className="p-4 text-right text-red-500 font-medium">-{allocated}</td>
                    <td className="p-4 text-right">
                      <span className={`font-black text-xl ${available > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                          {available}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                          <button 
                              onClick={() => { setSelectedPart(item.partNumber); setActiveModal('inward'); }}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                              title='Inward Stock'
                          >
                              <PlusIcon className="w-5 h-5" />
                          </button>
                          <button 
                               onClick={() => { setSelectedPart(item.partNumber); setActiveModal('walking'); }}
                               className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                               title='Walking Sale'
                          >
                              <CurrencyRupeeIcon className="w-5 h-5" />
                          </button>
                          <button 
                               onClick={() => { setSelectedPart(item.partNumber); setActiveModal('allocate'); }}
                               className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                               title='Allocate to PO'
                          >
                              <TruckIcon className="w-5 h-5" />
                          </button>
                          <button 
                               onClick={() => { setSelectedPart(item.partNumber); setActiveModal('history'); }}
                               className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                               title='History'
                          >
                              <ClockIcon className="w-5 h-5" />
                          </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStock.length === 0 && (
            <div className="p-12 text-center text-slate-500 italic">No inventory records found.</div>
          )}
        </div>
      </div>

      {/* Stock Adjust Modal (Combined for Inward, Walking, Allocation, Register) */}
      {activeModal && activeModal !== 'history' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                {activeModal === 'registerPart' ? 'Register New Part Number' : `${activeModal.replace('_', ' ')} Stock: ${selectedPart}`}
              </h3>
              <button onClick={closeModal}><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {activeModal === 'registerPart' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Part Number</label>
                        <input 
                            type="text"
                            required
                            placeholder="e.g., VALV-5W30-1L"
                            className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formState.partNumber}
                            onChange={e => setFormState({ ...formState, partNumber: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Part Description</label>
                        <textarea 
                            required
                            placeholder="Briefly describe the part..."
                            className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formState.description}
                            onChange={e => setFormState({ ...formState, description: e.target.value })}
                        />
                    </div>
                </div>
              )}

              {activeModal === 'allocate' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Quick Find PO</label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Type PO# or Customer to filter list..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none shadow-inner"
                        value={poSearchQuery}
                        onChange={e => setPoSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Select Target Purchase Order</label>
                    <select 
                        required
                        className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-amber-500"
                        value={formState.poId}
                        onChange={handlePOSelectionChange}
                    >
                        <option value="">{targetPOsForPart.length > 0 ? "Choose PO needing this part" : "No pending POs need this part"}</option>
                        {targetPOsForPart.map(po => {
                            const item = po.items.find(i => (i.partNumber || '').trim().toLowerCase() === selectedPart?.trim().toLowerCase());
                            const needed = item ? (Number(item.quantity || 0) - Number(item.allocatedQuantity || 0)) : 0;
                            return (
                                <option key={po.id} value={po.id}>
                                    #{po.poNumber} - {po.customerName} (Needs: {needed})
                                </option>
                            );
                        })}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Quantity</label>
                    <input 
                        type="number"
                        min="0"
                        required
                        className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-red-500"
                        value={formState.qty}
                        onChange={e => setFormState({ ...formState, qty: Number(e.target.value) })}
                    />
                </div>
                <div className="col-span-1 flex items-end">
                    <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">
                        {activeModal === 'allocate' ? 'Quantity to assign to PO' : activeModal === 'registerPart' ? 'Starting physical units' : 'Physical units to move'}
                    </p>
                </div>
              </div>

              {activeModal !== 'registerPart' && (
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300 uppercase tracking-tight">Remarks / Reference</label>
                  <textarea 
                      className="w-full p-3 rounded-lg border dark:bg-slate-700 dark:border-slate-600 dark:text-white border-slate-300 focus:ring-2 focus:ring-red-500 shadow-inner"
                      placeholder={activeModal === 'inward' ? 'e.g., Supplier Invoice #991' : activeModal === 'allocate' ? 'Reason for specific allocation' : 'e.g., Walk-in customer cash sale'}
                      value={formState.remark}
                      rows={2}
                      onChange={e => setFormState({ ...formState, remark: e.target.value })}
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-slate-500 font-bold hover:text-slate-700 transition-colors">Cancel</button>
                <button type="submit" className={`px-8 py-2.5 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 ${activeModal === 'inward' ? 'bg-green-600' : activeModal === 'allocate' ? 'bg-amber-600' : activeModal === 'registerPart' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                    {activeModal === 'registerPart' ? 'Register Part' : `Confirm ${activeModal}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {activeModal === 'history' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
               <div className="flex items-center gap-2">
                 <ClipboardDocumentListIcon className="w-6 h-6 text-slate-500" />
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">Movement Log: {selectedPart}</h3>
               </div>
               <button onClick={closeModal}><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                    {partHistory.length > 0 ? partHistory.map(m => (
                        <div key={m.id} className="flex items-start gap-4 p-4 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                            <div className={`p-2 rounded-full flex-shrink-0 ${
                                m.type === 'INWARD' ? 'bg-green-100 text-green-600' : 
                                m.type === 'OUTWARD_WALKING' ? 'bg-blue-100 text-blue-600' : 
                                'bg-amber-100 text-amber-600'
                            }`}>
                                {m.type === 'INWARD' ? <PlusIcon className="w-5 h-5" /> : m.type === 'OUTWARD_WALKING' ? <CurrencyRupeeIcon className="w-5 h-5" /> : <TruckIcon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="font-bold text-slate-800 dark:text-white capitalize">{m.type.replace('_', ' ').toLowerCase()}</p>
                                    <p className="text-xs text-slate-500">{new Date(m.timestamp).toLocaleString()}</p>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{m.remarks}</p>
                                <p className="text-base font-black mt-2">
                                    {m.type === 'INWARD' ? '+' : '-'} {m.quantity} Units
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-500 italic">No movements recorded yet.</div>
                    )}
                </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end">
                <button onClick={closeModal} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagementPane;
