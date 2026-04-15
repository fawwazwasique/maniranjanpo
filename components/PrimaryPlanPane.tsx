
import React, { useState, useMemo } from 'react';
import { TruckIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from './icons';
import { PurchaseOrder, POItemStatus } from '../types';
import { exportDataToCSV } from '../utils/export';

interface PrimaryPlanPaneProps {
    purchaseOrders: PurchaseOrder[];
}

const PrimaryPlanPane: React.FC<PrimaryPlanPaneProps> = ({ purchaseOrders }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const primaryPlan = useMemo(() => {
        const planMap: Record<string, {
            partNumber: string;
            description: string;
            requiredQty: number;
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
                        };
                    }
                    
                    const needed = item.quantity;
                    planMap[key].requiredQty += Math.max(0, needed);
                }
            });
        });

        return Object.values(planMap)
            .filter(item => 
                item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => b.requiredQty - a.requiredQty);
    }, [purchaseOrders, searchTerm]);

    const handleExport = () => {
        const data = primaryPlan.map(item => ({
            'Part Number': item.partNumber,
            'Description': item.description,
            'Required Qty': item.requiredQty,
        }));
        exportDataToCSV(data, `Primary_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <TruckIcon className="w-8 h-8 text-primary" />
                        <span>Primary Plan</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        View unavailable PO parts to plan primary orders.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-lg transition-all active:scale-95 text-sm font-bold"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Shortage SKUs</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{primaryPlan.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Required Qty</p>
                    <p className="text-2xl font-black text-red-600">{primaryPlan.reduce((sum, i) => sum + i.requiredQty, 0)}</p>
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {primaryPlan.map((item) => {
                                return (
                                    <tr key={item.partNumber} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{item.partNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.description}>
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-red-600">{item.requiredQty}</td>
                                    </tr>
                                );
                            })}
                            {primaryPlan.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
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
