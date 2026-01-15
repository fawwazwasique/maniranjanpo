
import React, { useState, useMemo } from 'react';
import type { PurchaseOrder, OverallPOStatus, FulfillmentStatus, POItem } from '../types';
import { POItemStatus } from '../types';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, TrashIcon, XMarkIcon } from './icons';
import { exportToCSV } from '../utils/export';

interface AllOrdersPaneProps {
  purchaseOrders: PurchaseOrder[];
  onSelectPO: (po: PurchaseOrder) => void;
  onDeletePO: (poId: string) => void;
  filter?: { status?: OverallPOStatus, fulfillmentStatus?: FulfillmentStatus } | null;
  onClearFilter?: () => void;
}

type SortKeys = 'poNumber' | 'customerName' | 'poDate' | 'totalValue' | 'status' | 'fulfillmentStatus' | 'orderStatus';

const AllOrdersPane: React.FC<AllOrdersPaneProps> = ({ purchaseOrders, onSelectPO, onDeletePO, filter, onClearFilter }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKeys; direction: 'ascending' | 'descending' } | null>({ key: 'poDate', direction: 'descending' });

    const posWithValues = useMemo(() => {
        return purchaseOrders.map(po => ({
            ...po,
            totalValue: (po.items || []).reduce((acc, item) => {
                const val = Number(item.quantity || 0) * Number(item.rate || 0);
                return acc + (isNaN(val) ? 0 : val);
            }, 0)
        }));
    }, [purchaseOrders]);
    
    const filteredAndSortedPOs = useMemo(() => {
        let sortableItems = [...posWithValues];

        // Apply external filter
        if (filter) {
            if (filter.status) {
                 sortableItems = sortableItems.filter(po => po.status === filter.status || (filter.status === 'Open' && po.status === 'Partially Dispatched'));
            }
            if (filter.fulfillmentStatus) {
                sortableItems = sortableItems.filter(po => po.fulfillmentStatus === filter.fulfillmentStatus);
            }
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(po =>
                (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.mainBranch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.subBranch || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [posWithValues, searchTerm, sortConfig, filter]);
    
    const requestSort = (key: SortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortKeys) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const getItemStats = (items: POItem[]) => {
        const i = items || [];
        const available = i.filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
        const partial = i.filter(i => i.status === POItemStatus.PartiallyAvailable).length;
        const notAvailable = i.filter(i => i.status === POItemStatus.NotAvailable).length;
        return { available, partial, notAvailable };
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-base rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    {filter && (
                         <div className="flex items-center gap-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-3 py-1.5 rounded-full text-sm font-medium">
                            <span>Filtering by: {filter.status || filter.fulfillmentStatus}</span>
                            <button onClick={onClearFilter} className="hover:text-red-900 dark:hover:text-white"><XMarkIcon className="w-4 h-4"/></button>
                         </div>
                    )}
                    <button
                        onClick={() => exportToCSV(filteredAndSortedPOs)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export to Excel
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-auto rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-base text-slate-500 dark:text-slate-400">
                    <thead className="text-sm text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('poNumber')}>PO Number {getSortIndicator('poNumber')}</th>
                            <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('customerName')}>Customer {getSortIndicator('customerName')}</th>
                            <th scope="col" className="p-4">Branch</th>
                            <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('poDate')}>Date {getSortIndicator('poDate')}</th>
                            <th scope="col" className="p-4 cursor-pointer text-right" onClick={() => requestSort('totalValue')}>Value {getSortIndicator('totalValue')}</th>
                            <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('orderStatus')}>Order Status {getSortIndicator('orderStatus')}</th>
                            <th scope="col" className="p-4 w-64">Item Availability (Breakdown)</th>
                            <th scope="col" className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800/50">
                        {filteredAndSortedPOs.map(po => {
                            const stats = getItemStats(po.items);
                            const totalItems = (po.items || []).length;
                            return (
                                <tr key={po.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{po.poNumber}</td>
                                    <td className="p-4">{po.customerName}</td>
                                    <td className="p-4">{po.mainBranch}{po.subBranch && ` / ${po.subBranch}`}</td>
                                    <td className="p-4">{new Date(po.poDate).toLocaleDateString()}</td>
                                    <td className="p-4 text-right font-semibold">{po.totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                    <td className="p-4 font-medium">{po.orderStatus}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                            <div className="flex text-xs font-semibold text-white overflow-hidden rounded-full h-4 w-full bg-slate-200 dark:bg-slate-700">
                                                {stats.available > 0 && (
                                                    <div className="bg-green-500 flex items-center justify-center" style={{ width: `${(stats.available / totalItems) * 100}%` }} title={`${stats.available} Available`}></div>
                                                )}
                                                {stats.partial > 0 && (
                                                    <div className="bg-yellow-500 flex items-center justify-center" style={{ width: `${(stats.partial / totalItems) * 100}%` }} title={`${stats.partial} Partial`}></div>
                                                )}
                                                {stats.notAvailable > 0 && (
                                                    <div className="bg-red-500 flex items-center justify-center" style={{ width: `${(stats.notAvailable / totalItems) * 100}%` }} title={`${stats.notAvailable} Not Available`}></div>
                                                )}
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                <span className={stats.available > 0 ? "text-green-600 dark:text-green-400" : ""}>{stats.available} Avail</span>
                                                <span className={stats.partial > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}>{stats.partial} Part</span>
                                                <span className={stats.notAvailable > 0 ? "text-red-600 dark:text-red-400" : ""}>{stats.notAvailable} N/A</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => onSelectPO(po)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Details</button>
                                            <button onClick={() => onDeletePO(po.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {filteredAndSortedPOs.length === 0 && (
                    <div className="text-center p-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50">
                        No orders match your criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllOrdersPane;
