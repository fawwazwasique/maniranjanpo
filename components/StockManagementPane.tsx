
import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  TrashIcon,
  FunnelIcon,
  DatabaseIcon
} from './icons';
import { BranchStock, StockMovement } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { downloadStockTemplate } from '../utils/export';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface StockManagementPaneProps {
  branchStock: BranchStock[];
  onSyncStock?: () => Promise<void>;
  isSyncing?: boolean;
}

const StockManagementPane: React.FC<StockManagementPaneProps> = ({ branchStock, onSyncStock, isSyncing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newStock, setNewStock] = useState({
    partNumber: '',
    description: '',
    quantity: 0,
    branch: '',
    sourceBranch: '',
    destinationBranch: '',
    minThreshold: 0,
    type: 'INWARD' as 'INWARD' | 'OUTWARD' | 'TRANSFER' | 'THRESHOLD'
  });

  const branches = useMemo(() => {
    const b = new Set(branchStock.map(s => s.branch));
    return ['All', ...Array.from(b).sort()];
  }, [branchStock]);

  const filteredStock = useMemo(() => {
    return branchStock.filter(item => {
      const matchesSearch = 
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = selectedBranch === 'All' || item.branch === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [branchStock, searchTerm, selectedBranch]);

  const handleStockAction = async () => {
    if (!newStock.partNumber || (newStock.type !== 'TRANSFER' && !newStock.branch) || (newStock.type === 'TRANSFER' && (!newStock.sourceBranch || !newStock.destinationBranch)) || newStock.quantity < 0) {
      alert("Please fill all fields correctly.");
      return;
    }

    try {
      const batch = writeBatch(db);

      if (newStock.type === 'TRANSFER') {
        const source = branchStock.find(s => s.partNumber.toLowerCase() === newStock.partNumber.toLowerCase() && s.branch === newStock.sourceBranch);
        const dest = branchStock.find(s => s.partNumber.toLowerCase() === newStock.partNumber.toLowerCase() && s.branch === newStock.destinationBranch);

        if (!source || source.quantity < newStock.quantity) {
          alert("Insufficient stock in source branch.");
          return;
        }

        // Deduct from source
        batch.update(doc(db, "branchStock", source.id), {
          quantity: source.quantity - newStock.quantity,
          updatedAt: new Date().toISOString()
        });

        // Add to destination
        if (dest) {
          batch.update(doc(db, "branchStock", dest.id), {
            quantity: dest.quantity + newStock.quantity,
            updatedAt: new Date().toISOString()
          });
        } else {
          const newRef = doc(collection(db, "branchStock"));
          batch.set(newRef, {
            partNumber: source.partNumber,
            description: source.description,
            quantity: newStock.quantity,
            branch: newStock.destinationBranch,
            updatedAt: new Date().toISOString()
          });
        }

        // Record movement
        const moveRef = doc(collection(db, "stockMovements"));
        batch.set(moveRef, {
          partNumber: newStock.partNumber,
          type: 'TRANSFER',
          quantity: newStock.quantity,
          sourceBranch: newStock.sourceBranch,
          destinationBranch: newStock.destinationBranch,
          timestamp: serverTimestamp(),
          remarks: `Transfer from ${newStock.sourceBranch} to ${newStock.destinationBranch}`
        });

      } else if (newStock.type === 'THRESHOLD') {
        const existing = branchStock.find(s => s.partNumber.toLowerCase() === newStock.partNumber.toLowerCase() && s.branch === newStock.branch);
        if (existing) {
          batch.update(doc(db, "branchStock", existing.id), {
            minThreshold: newStock.minThreshold,
            updatedAt: new Date().toISOString()
          });
        } else {
          alert("Item not found in this branch. Add stock first.");
          return;
        }
      } else {
        const existing = branchStock.find(s => 
          s.partNumber.toLowerCase() === newStock.partNumber.toLowerCase() && 
          s.branch === newStock.branch
        );

        const movementQty = newStock.type === 'INWARD' ? newStock.quantity : -newStock.quantity;

        if (existing) {
          const newQty = Math.max(0, existing.quantity + movementQty);
          batch.update(doc(db, "branchStock", existing.id), {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });
        } else if (newStock.type === 'INWARD') {
          const newRef = doc(collection(db, "branchStock"));
          batch.set(newRef, {
            partNumber: newStock.partNumber,
            description: newStock.description,
            quantity: newStock.quantity,
            branch: newStock.branch,
            updatedAt: new Date().toISOString()
          });
        } else {
          alert("Cannot perform outward movement for non-existent stock.");
          return;
        }

        const moveRef = doc(collection(db, "stockMovements"));
        batch.set(moveRef, {
          partNumber: newStock.partNumber,
          type: newStock.type,
          quantity: newStock.quantity,
          branch: newStock.branch,
          timestamp: serverTimestamp(),
          remarks: `Manual ${newStock.type} entry`
        });
      }

      await batch.commit();
      setIsAddingStock(false);
      setNewStock({ partNumber: '', description: '', quantity: 0, branch: '', sourceBranch: '', destinationBranch: '', minThreshold: 0, type: 'INWARD' });
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Failed to update stock.");
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          let batch = writeBatch(db);
          let count = 0;
          let totalUploaded = 0;

          for (const row of results.data as any[]) {
            const partNumber = row['Item Name']?.trim();
            const description = row['Item Description']?.trim() || '';
            const quantity = parseInt(row['Quantity']) || 0;
            const branch = row['Branch']?.trim();

            if (!partNumber || !branch) continue;

            const existing = branchStock.find(s => 
              s.partNumber.toLowerCase() === partNumber.toLowerCase() && 
              s.branch === branch
            );

            if (existing) {
              batch.update(doc(db, "branchStock", existing.id), {
                quantity: quantity, 
                description: description || existing.description,
                updatedAt: new Date().toISOString()
              });
            } else {
              const newRef = doc(collection(db, "branchStock"));
              batch.set(newRef, {
                partNumber,
                description,
                quantity,
                branch,
                updatedAt: new Date().toISOString()
              });
            }

            const moveRef = doc(collection(db, "stockMovements"));
            batch.set(moveRef, {
              partNumber,
              type: 'INWARD',
              quantity,
              branch,
              timestamp: serverTimestamp(),
              remarks: 'Bulk Upload'
            });

            count++;
            totalUploaded++;
            
            // Firestore limit is 500 operations per batch. 
            // We do 2 operations per item (update/set + movement), so max 250 items per batch.
            if (count >= 200) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }

          alert(`Successfully uploaded ${totalUploaded} stock items.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
          console.error("Error uploading stock:", error);
          alert("Failed to upload stock data.");
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        console.error("CSV Parsing error:", error);
        alert("Error parsing CSV file.");
        setIsUploading(false);
      }
    });
  };

  const handleDeleteStock = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this stock entry?")) {
      try {
        await deleteDoc(doc(db, "branchStock", id));
      } catch (error) {
        console.error("Error deleting stock:", error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DatabaseIcon className="w-6 h-6 text-primary" />
            Stock Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor and update branch-wise inventory levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadStockTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Template
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleBulkUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className={`w-5 h-5 ${isUploading ? 'animate-bounce' : ''}`} />
            {isUploading ? 'Uploading...' : 'Bulk Upload'}
          </button>
          {onSyncStock && (
            <button 
              onClick={onSyncStock}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all active:scale-95 shadow-sm ${isSyncing ? 'opacity-50' : 'hover:bg-slate-50'}`}
            >
              <ArrowUpTrayIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync All POs'}
            </button>
          )}
          <button 
            onClick={() => setIsAddingStock(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <PlusIcon className="w-5 h-5" />
            Update Stock
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search Part Number or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-slate-400" />
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm py-2"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-end gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total SKU Count</p>
            <p className="text-lg font-black text-slate-800 dark:text-white">{filteredStock.length}</p>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Part Number</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Min Threshold</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filteredStock.length > 0 ? (
                filteredStock.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{item.partNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{item.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {item.branch}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black ${item.quantity > (item.minThreshold || 0) ? 'text-green-600' : 'text-red-600'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-slate-500">
                        {item.minThreshold || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteStock(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No stock items found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Stock Modal */}
      {isAddingStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Update Stock Levels</h3>
              <button onClick={() => setIsAddingStock(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <PlusIcon className="w-6 h-6 rotate-45 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button 
                  onClick={() => setNewStock(prev => ({ ...prev, type: 'INWARD' }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all ${newStock.type === 'INWARD' ? 'bg-white dark:bg-slate-800 text-green-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Inward
                </button>
                <button 
                  onClick={() => setNewStock(prev => ({ ...prev, type: 'OUTWARD' }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all ${newStock.type === 'OUTWARD' ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Outward
                </button>
                <button 
                  onClick={() => setNewStock(prev => ({ ...prev, type: 'TRANSFER' }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all ${newStock.type === 'TRANSFER' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Transfer
                </button>
                <button 
                  onClick={() => setNewStock(prev => ({ ...prev, type: 'THRESHOLD' }))}
                  className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-bold transition-all ${newStock.type === 'THRESHOLD' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Threshold
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Part Number</label>
                <input 
                  type="text"
                  value={newStock.partNumber}
                  onChange={(e) => setNewStock(prev => ({ ...prev, partNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="Enter Part Number"
                />
              </div>

              {newStock.type === 'TRANSFER' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Source Branch</label>
                    <input 
                      type="text"
                      value={newStock.sourceBranch}
                      onChange={(e) => setNewStock(prev => ({ ...prev, sourceBranch: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="From..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Dest. Branch</label>
                    <input 
                      type="text"
                      value={newStock.destinationBranch}
                      onChange={(e) => setNewStock(prev => ({ ...prev, destinationBranch: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="To..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Branch</label>
                  <input 
                    type="text"
                    value={newStock.branch}
                    onChange={(e) => setNewStock(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="e.g. Bangalore"
                  />
                </div>
              )}

              {newStock.type === 'THRESHOLD' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Min Threshold</label>
                  <input 
                    type="number"
                    value={newStock.minThreshold}
                    onChange={(e) => setNewStock(prev => ({ ...prev, minThreshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Quantity</label>
                    <input 
                      type="number"
                      value={newStock.quantity}
                      onChange={(e) => setNewStock(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                </div>
              )}

              {newStock.type !== 'TRANSFER' && newStock.type !== 'THRESHOLD' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description (Optional)</label>
                  <input 
                    type="text"
                    value={newStock.description}
                    onChange={(e) => setNewStock(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="Enter Item Description"
                  />
                </div>
              )}

              <button 
                onClick={handleStockAction}
                className={`w-full py-3 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.98] mt-4 ${
                  newStock.type === 'INWARD' ? 'bg-green-600 shadow-green-600/20 hover:bg-green-700' : 
                  newStock.type === 'OUTWARD' ? 'bg-red-600 shadow-red-600/20 hover:bg-red-700' :
                  newStock.type === 'TRANSFER' ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700' :
                  'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700'
                }`}
              >
                Confirm {newStock.type.charAt(0) + newStock.type.slice(1).toLowerCase()} Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagementPane;
