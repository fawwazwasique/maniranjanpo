
import React, { useState, useMemo } from 'react';
import { TruckIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from './icons';
import { PurchaseOrder, POItemStatus, BranchStock } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { db } from '../services/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { exportDataToCSV, downloadStockTemplate } from '../utils/export';

interface PrimaryPlanPaneProps {
    purchaseOrders: PurchaseOrder[];
    branchStock: BranchStock[];
}

const PrimaryPlanPane: React.FC<PrimaryPlanPaneProps> = ({ purchaseOrders, branchStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) return;

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                
                const nameIdx = headers.findIndex(h => h.includes('item name') || h.includes('part number'));
                const descIdx = headers.findIndex(h => h.includes('description'));
                const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
                const branchIdx = headers.findIndex(h => h.includes('branch'));

                if (nameIdx === -1 || qtyIdx === -1 || branchIdx === -1) {
                    alert('Invalid CSV format. Required columns: Item Name, Item Description, Quantity, Branch');
                    return;
                }

                const batch = writeBatch(db);
                const stockCollection = collection(db, "branchStock");

                // Clear existing stock (optional, but usually preferred for a fresh report)
                // For simplicity in this demo, we'll just add/update. 
                // A real app might want to clear or use a timestamp to filter.

                const rows = lines.slice(1);
                for (const line of rows) {
                    const values = line.split(',').map(v => v.trim());
                    const partNumber = values[nameIdx];
                    const description = values[descIdx] || '';
                    const quantity = parseFloat(values[qtyIdx]) || 0;
                    const branch = values[branchIdx];

                    if (partNumber && branch) {
                        const stockId = `${partNumber}_${branch}`.replace(/\//g, '_');
                        const stockRef = doc(stockCollection, stockId);
                        batch.set(stockRef, {
                            partNumber,
                            description,
                            quantity,
                            branch,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }

                await batch.commit();
                alert('Stock report uploaded successfully!');
            } catch (error) {
                console.error('Error uploading stock:', error);
                alert('Failed to upload stock report.');
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const primaryPlan = useMemo(() => {
        const planMap: Record<string, {
            partNumber: string;
            description: string;
            requiredQty: number;
            branchStock: Record<string, number>;
            totalPanStock: number;
        }> = {};

        purchaseOrders.forEach(po => {
            po.items.forEach(item => {
                if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                    const key = item.partNumber;
                    if (!planMap[key]) {
                        planMap[key] = {
                            partNumber: item.partNumber,
                            description: item.itemDesc || '',
                            requiredQty: 0,
                            branchStock: {},
                            totalPanStock: 0
                        };
                    }
                    
                    const needed = item.quantity - (item.allocatedQuantity || 0);
                    planMap[key].requiredQty += Math.max(0, needed);
                }
            });
        });

        // Map with stock
        Object.values(planMap).forEach(item => {
            const stocks = branchStock.filter(s => s.partNumber === item.partNumber);
            item.totalPanStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
            stocks.forEach(s => {
                item.branchStock[s.branch] = s.quantity;
            });
        });

        return Object.values(planMap)
            .filter(item => 
                item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => b.requiredQty - a.requiredQty);
    }, [purchaseOrders, branchStock, searchTerm]);

    const handleExport = () => {
        const data = primaryPlan.map(item => ({
            'Part Number': item.partNumber,
            'Description': item.description,
            'Required Qty': item.requiredQty,
            'PAN Stock': item.totalPanStock,
            'Primary Order Qty': Math.max(0, item.requiredQty - item.totalPanStock)
        }));
        exportDataToCSV(data, `Primary_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <TruckIcon className="w-8 h-8 text-primary" />
                        <span>Primary Plan & Stock Mapping</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Map unavailable PO parts against Branch and PAN stock to plan primary orders.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={downloadStockTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all active:scale-95 text-sm font-bold"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Download Template
                    </button>
                    <label className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer shadow-lg transition-all active:scale-95 text-sm font-bold ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        {isUploading ? 'Uploading...' : 'Upload Stock Report'}
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-lg transition-all active:scale-95 text-sm font-bold"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Shortage SKUs</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{primaryPlan.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Required Qty</p>
                    <p className="text-2xl font-black text-red-600">{primaryPlan.reduce((sum, i) => sum + i.requiredQty, 0)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available PAN Stock</p>
                    <p className="text-2xl font-black text-green-600">{primaryPlan.reduce((sum, i) => sum + i.totalPanStock, 0)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Primary Requirement</p>
                    <p className="text-2xl font-black text-primary">{primaryPlan.reduce((sum, i) => sum + Math.max(0, i.requiredQty - i.totalPanStock), 0)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by Part Number or Description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Part Number</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Required Qty</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Branch Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">PAN Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center text-primary">Primary Order Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {primaryPlan.map((item) => {
                                const primaryOrderQty = Math.max(0, item.requiredQty - item.totalPanStock);
                                return (
                                    <tr key={item.partNumber} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{item.partNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.description}>
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-red-600">{item.requiredQty}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-1">
                                                {Object.entries(item.branchStock).length > 0 ? (
                                                    Object.entries(item.branchStock).map(([branch, qty]) => (
                                                        <span key={branch} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                                            {branch}: <span className="font-bold">{qty}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No branch stock</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{item.totalPanStock}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${primaryOrderQty > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {primaryOrderQty}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {primaryPlan.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                                        No unavailable parts found in active POs.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PrimaryPlanPane;
