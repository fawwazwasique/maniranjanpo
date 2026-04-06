
import React, { useMemo, useState } from 'react';
import type { PurchaseOrder } from '../types';
import { FulfillmentStatus, OrderStatus, POItemStatus } from '../types';
import { getPOFulfillmentStatus, getPOValue } from '../utils/poUtils';
import { formatToCr } from '../utils/currencyUtils';
import { ClipboardDocumentListIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, MagnifyingGlassIcon, FunnelIcon } from './icons';

interface DetailedBreakdownPaneProps {
    purchaseOrders: PurchaseOrder[];
    onSelectPO?: (po: PurchaseOrder) => void;
}

const DetailedBreakdownPane: React.FC<DetailedBreakdownPaneProps> = ({ purchaseOrders, onSelectPO }) => {
    const [activeTab, setActiveTab] = useState<'ready' | 'partial' | 'notAvailable'>('ready');
    const [searchTerm, setSearchTerm] = useState('');

    const activePOs = useMemo(() => {
        return purchaseOrders.filter(po => po.orderStatus !== OrderStatus.Invoiced);
    }, [purchaseOrders]);

    const categorizedData = useMemo(() => {
        const ready: PurchaseOrder[] = [];
        const partial: PurchaseOrder[] = [];
        const notAvailable: PurchaseOrder[] = [];

        activePOs.forEach(po => {
            const status = getPOFulfillmentStatus(po, []);
            if (status === FulfillmentStatus.Available) ready.push(po);
            else if (status === FulfillmentStatus.PartiallyAvailable) partial.push(po);
            else if (status === FulfillmentStatus.NotAvailable) notAvailable.push(po);
        });

        return { ready, partial, notAvailable };
    }, [activePOs]);

    const displayData = useMemo(() => {
        let data = categorizedData[activeTab];
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            data = data.filter(po => 
                po.poNumber.toLowerCase().includes(search) || 
                po.customerName.toLowerCase().includes(search)
            );
        }
        return data;
    }, [categorizedData, activeTab, searchTerm]);

    const getTabConfig = (tab: typeof activeTab) => {
        switch (tab) {
            case 'ready':
                return { label: 'Ready to Execute', icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-600', bgColor: 'bg-green-50' };
            case 'partial':
                return { label: 'Partially Available', icon: <ClockIcon className="w-5 h-5" />, color: 'text-amber-600', bgColor: 'bg-amber-50' };
            case 'notAvailable':
                return { label: '100% Not Available', icon: <ExclamationTriangleIcon className="w-5 h-5" />, color: 'text-red-600', bgColor: 'bg-red-50' };
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ClipboardDocumentListIcon className="w-8 h-8 text-red-600" />
                        Detailed Fulfillment Breakdown
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Detailed view of orders categorized by their current fulfillment status.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search PO or Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['ready', 'partial', 'notAvailable'] as const).map(tab => {
                    const config = getTabConfig(tab);
                    const count = categorizedData[tab].length;
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${
                                isActive 
                                    ? 'border-red-500 bg-white dark:bg-slate-800 shadow-lg scale-[1.02]' 
                                    : 'border-transparent bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${config.bgColor} dark:bg-slate-700`}>
                                    {React.cloneElement(config.icon as React.ReactElement<any>, { className: `w-6 h-6 ${config.color}` })}
                                </div>
                                <span className={`text-2xl font-black ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{count}</span>
                            </div>
                            <h3 className={`text-lg font-bold ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{config.label}</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Total Value: {formatToCr(categorizedData[tab].reduce((acc, po) => acc + getPOValue(po, []), 0))}</p>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer & Branch</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Order Value</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Items</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {displayData.map(po => {
                                const value = getPOValue(po, []);
                                const status = getPOFulfillmentStatus(po, []);
                                
                                // Calculate available vs gap for partial
                                let availValue = 0;
                                let gapValue = 0;
                                if (status === FulfillmentStatus.PartiallyAvailable) {
                                    po.items.forEach(item => {
                                        const itemVal = Number(item.quantity) * Number(item.rate);
                                        if (item.status === POItemStatus.Available) availValue += itemVal;
                                        else gapValue += itemVal;
                                    });
                                }

                                return (
                                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-white">{po.poNumber}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">{po.poDate}</span>
                                                {po.orderStatus === OrderStatus.PartiallyInvoiced && (
                                                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded uppercase border border-purple-200 dark:border-purple-800">
                                                        Partially Invoiced
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700 dark:text-slate-200">{po.customerName}</div>
                                            <div className="text-xs text-slate-400">{po.mainBranch} | {po.zone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-slate-800 dark:text-white">{formatToCr(value)}</div>
                                            {status === FulfillmentStatus.PartiallyAvailable ? (
                                                <div className="text-[10px] flex justify-end gap-2 mt-1">
                                                    <span className="text-green-600 font-bold">Avail: {formatToCr(availValue)}</span>
                                                    <span className="text-red-600 font-bold">Gap: {formatToCr(gapValue)}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{po.paymentNotes}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {po.items?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => onSelectPO?.(po)}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No orders found in this category.
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

export default DetailedBreakdownPane;
