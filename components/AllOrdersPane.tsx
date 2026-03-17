
import React, { useState, useMemo } from 'react';
import type { PurchaseOrder, OverallPOStatus, POItem } from '../types';
import { POItemStatus, FulfillmentStatus } from '../types';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, TrashIcon, XMarkIcon, ChevronDownIcon } from './icons';
import { exportToCSV } from '../utils/export';
import { isOilStuckPO } from '../utils/poUtils';
import { formatDate, isDateInRange, parseDate } from '../utils/dateUtils';

interface AllOrdersPaneProps {
  purchaseOrders: PurchaseOrder[];
  onSelectPO: (po: PurchaseOrder) => void;
  onDeletePO: (poId: string | string[]) => void;
  filter?: { 
      status?: OverallPOStatus, 
      fulfillmentStatus?: FulfillmentStatus,
      isOilStuck?: boolean,
      partNumber?: string,
      hasAnyShortage?: boolean
  } | null;
  onClearFilter?: () => void;
  selectedCategories?: string[];
  dashboardFilters?: {
    statuses: string[];
    customer: string;
    startDate: string;
    endDate: string;
    mainBranches: string[];
    subBranches: string[];
    categories: string[];
    customerCategories: string[];
    zones: string[];
  };
  setDashboardFilters?: React.Dispatch<React.SetStateAction<{
    statuses: string[];
    customer: string;
    startDate: string;
    endDate: string;
    mainBranches: string[];
    subBranches: string[];
    categories: string[];
    customerCategories: string[];
    zones: string[];
  }>>;
}

type SortKeys = 'poNumber' | 'customerName' | 'poDate' | 'totalValue' | 'status' | 'fulfillmentStatus' | 'orderStatus';

const getDynamicFulfillmentStatus = (items: POItem[]) => {
    if (items.length === 0) return FulfillmentStatus.NotAvailable;
    const fullyAvailableCount = items.filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
    const notAvailableCount = items.filter(i => i.status === POItemStatus.NotAvailable).length;
    
    if (fullyAvailableCount === items.length) return FulfillmentStatus.Available;
    if (notAvailableCount === items.length) return FulfillmentStatus.NotAvailable;
    return FulfillmentStatus.PartiallyAvailable;
};

const AllOrdersPane: React.FC<AllOrdersPaneProps> = ({ purchaseOrders, onSelectPO, onDeletePO, filter, onClearFilter, selectedCategories = [], dashboardFilters, setDashboardFilters }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKeys; direction: 'ascending' | 'descending' } | null>({ key: 'poDate', direction: 'descending' });
    const [viewMode, setViewMode] = useState<'orders' | 'parts'>('orders');
    const [partsFilter, setPartsFilter] = useState<'all' | 'available' | 'notAvailable'>('all');
    const [selectedPOIds, setSelectedPOIds] = useState<string[]>([]);

    const mainBranches = useMemo(() => {
        const branches = new Set<string>();
        purchaseOrders.forEach(po => {
            if (po.mainBranch) branches.add(po.mainBranch);
        });
        return Array.from(branches).sort();
    }, [purchaseOrders]);

    const subBranches = useMemo(() => {
        const branches = new Set<string>();
        purchaseOrders.forEach(po => {
            if (po.subBranch) branches.add(po.subBranch);
        });
        return Array.from(branches).sort();
    }, [purchaseOrders]);

    const posWithValues = useMemo(() => {
        return purchaseOrders.map(po => {
            const relevantItems = (po.items || []).filter(item => 
                selectedCategories.length === 0 || selectedCategories.includes(item.category)
            );
            
            const totalValue = relevantItems.reduce((acc, item) => {
                const val = Number(item.quantity || 0) * Number(item.rate || 0);
                return acc + (isNaN(val) ? 0 : val);
            }, 0);

            return {
                ...po,
                filteredItems: relevantItems,
                totalValue
            };
        }).filter(po => {
            if (selectedCategories.length === 0) return true;
            return (po.items || []).some(item => selectedCategories.includes(item.category));
        });
    }, [purchaseOrders, selectedCategories]);
    
    const filteredAndSortedPOs = useMemo(() => {
        let sortableItems = [...posWithValues];

        // Apply external filter
        if (filter) {
            if (filter.status) {
                sortableItems = sortableItems.filter(po => po.status === filter.status);
            }
            if (filter.fulfillmentStatus) {
                sortableItems = sortableItems.filter(po => getDynamicFulfillmentStatus(po.filteredItems) === filter.fulfillmentStatus);
            }
            if (filter.isOilStuck) {
                sortableItems = sortableItems.filter(po => isOilStuckPO(po));
            }
            if (filter.partNumber) {
                sortableItems = sortableItems.filter(po => po.items.some(item => item.partNumber === filter.partNumber));
            }
            if (filter.hasAnyShortage) {
                sortableItems = sortableItems.filter(po => getDynamicFulfillmentStatus(po.filteredItems) !== FulfillmentStatus.Available);
            }
        }

        // Apply dashboard filters
        if (dashboardFilters) {
            if (dashboardFilters.statuses && dashboardFilters.statuses.length > 0) {
                sortableItems = sortableItems.filter(po => dashboardFilters.statuses.includes(po.status));
            }
            if (dashboardFilters.customer) {
                sortableItems = sortableItems.filter(po => (po.customerName || '').toLowerCase().includes(dashboardFilters.customer.toLowerCase()));
            }
            if (dashboardFilters.startDate || dashboardFilters.endDate) {
                sortableItems = sortableItems.filter(po => isDateInRange(po.poDate, dashboardFilters.startDate, dashboardFilters.endDate));
            }
            if (dashboardFilters.mainBranches && dashboardFilters.mainBranches.length > 0) {
                sortableItems = sortableItems.filter(po => dashboardFilters.mainBranches.includes(po.mainBranch || ''));
            }
            if (dashboardFilters.subBranches && dashboardFilters.subBranches.length > 0) {
                sortableItems = sortableItems.filter(po => dashboardFilters.subBranches.includes(po.subBranch || ''));
            }
            if (dashboardFilters.customerCategories && dashboardFilters.customerCategories.length > 0) {
                sortableItems = sortableItems.filter(po => dashboardFilters.customerCategories.includes(po.customerCategory || ''));
            }
            if (dashboardFilters.zones && dashboardFilters.zones.length > 0) {
                sortableItems = sortableItems.filter(po => dashboardFilters.zones.includes(po.zone || ''));
            }
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(po =>
                (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.mainBranch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.subBranch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.customerCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.zone || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let valA: any = a[sortConfig.key];
                let valB: any = b[sortConfig.key];

                // Special handling for dates
                if (sortConfig.key === 'poDate' || sortConfig.key === 'soDate' || sortConfig.key === 'invoiceDate') {
                    const dateA = parseDate(valA)?.getTime() || 0;
                    const dateB = parseDate(valB)?.getTime() || 0;
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
                }

                // Special handling for numbers
                if (sortConfig.key === 'totalValue') {
                    const numA = Number(valA) || 0;
                    const numB = Number(valB) || 0;
                    return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
                }

                // Default string comparison
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();

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
    }, [posWithValues, searchTerm, sortConfig, filter, dashboardFilters]);
    
    const partsBreakdown = useMemo(() => {
        const partsMap: Record<string, { partNumber: string, description: string, quantity: number, value: number, poCount: number, status: 'available' | 'notAvailable' }> = {};
        filteredAndSortedPOs.forEach(po => {
            po.filteredItems.forEach(item => {
                const isAvail = item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched;
                const statusKey = isAvail ? 'available' : 'notAvailable';
                const key = `${item.partNumber}-${statusKey}`;
                
                if (!partsMap[key]) {
                    partsMap[key] = {
                        partNumber: item.partNumber,
                        description: item.itemDesc || 'N/A',
                        quantity: 0,
                        value: 0,
                        poCount: 0,
                        status: statusKey
                    };
                }
                partsMap[key].quantity += item.quantity;
                partsMap[key].value += (item.quantity * item.rate);
                partsMap[key].poCount += 1;
            });
        });
        return Object.values(partsMap)
            .filter(part => partsFilter === 'all' || part.status === partsFilter)
            .sort((a, b) => b.value - a.value);
    }, [filteredAndSortedPOs, partsFilter]);

    const fulfillmentStats = useMemo(() => {
        let availCount = 0;
        let availValue = 0;
        let notAvailCount = 0;
        let notAvailValue = 0;

        filteredAndSortedPOs.forEach(po => {
            po.filteredItems.forEach(item => {
                const val = (item.quantity || 0) * (item.rate || 0);
                if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                    availCount++;
                    availValue += val;
                } else {
                    notAvailCount++;
                    notAvailValue += val;
                }
            });
        });
        return { availCount, availValue, notAvailCount, notAvailValue };
    }, [filteredAndSortedPOs]);

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

    const isFulfillmentFilter = filter?.fulfillmentStatus !== undefined || filter?.hasAnyShortage === true;

    const toggleSelectAll = () => {
        if (selectedPOIds.length === filteredAndSortedPOs.length) {
            setSelectedPOIds([]);
        } else {
            setSelectedPOIds(filteredAndSortedPOs.map(po => po.id));
        }
    };

    const toggleSelectPO = (id: string) => {
        setSelectedPOIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = () => {
        if (selectedPOIds.length === 0) return;
        onDeletePO(selectedPOIds);
        setSelectedPOIds([]);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            {isFulfillmentFilter && (
                <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div 
                            onClick={() => {
                                setViewMode('parts');
                                setPartsFilter(prev => prev === 'available' ? 'all' : 'available');
                            }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-green-500 ${partsFilter === 'available' ? 'ring-2 ring-green-500' : ''}`}
                        >
                            <p className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Available Items</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-2xl font-black text-green-800 dark:text-green-300">{fulfillmentStats.availCount}</p>
                                <p className="text-lg font-bold text-green-600/70">{fulfillmentStats.availValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}</p>
                            </div>
                        </div>
                        <div 
                            onClick={() => {
                                setViewMode('parts');
                                setPartsFilter(prev => prev === 'notAvailable' ? 'all' : 'notAvailable');
                            }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-500 ${partsFilter === 'notAvailable' ? 'ring-2 ring-red-500' : ''}`}
                        >
                            <p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Not Available Items</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-2xl font-black text-red-800 dark:text-red-300">{fulfillmentStats.notAvailCount}</p>
                                <p className="text-lg font-bold text-red-600/70">{fulfillmentStats.notAvailValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                        <button 
                            onClick={() => setViewMode('orders')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'orders' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            View Orders
                        </button>
                        <button 
                            onClick={() => setViewMode('parts')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'parts' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            View Parts Breakdown
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-base rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex flex-wrap gap-1 max-w-[400px]">
                            {dashboardFilters?.statuses && dashboardFilters.statuses.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {dashboardFilters.statuses.map(s => (
                                        <span key={s} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {dashboardFilters?.customerCategories && dashboardFilters.customerCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {dashboardFilters.customerCategories.map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {dashboardFilters?.zones && dashboardFilters.zones.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {dashboardFilters.zones.map(z => (
                                        <span key={z} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                                            {z}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {(dashboardFilters?.mainBranches?.length || 0) > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {dashboardFilters?.mainBranches.map(b => (
                                        <span key={b} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                        <select 
                            value={`${sortConfig?.key}-${sortConfig?.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key: key as SortKeys, direction: direction as 'ascending' | 'descending' });
                            }}
                            className="w-full pl-3 pr-10 py-2.5 text-sm font-medium rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 appearance-none"
                        >
                            <option value="poDate-descending">Date: Newest First</option>
                            <option value="poDate-ascending">Date: Oldest First</option>
                            <option value="totalValue-descending">Value: High to Low</option>
                            <option value="totalValue-ascending">Value: Low to High</option>
                            <option value="poNumber-ascending">PO Number: A-Z</option>
                            <option value="customerName-ascending">Customer: A-Z</option>
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {(filter || (dashboardFilters?.mainBranches?.length || 0) > 0 || (dashboardFilters?.subBranches?.length || 0) > 0 || (dashboardFilters?.statuses?.length || 0) > 0 || dashboardFilters?.customer || dashboardFilters?.startDate || dashboardFilters?.endDate) && (
                         <div className="flex items-center gap-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 px-3 py-1.5 rounded-full text-sm font-medium">
                            <span>Filtering Active</span>
                            <button onClick={() => {
                                onClearFilter?.();
                                setDashboardFilters?.({
                                    statuses: [],
                                    customer: '',
                                    startDate: '',
                                    endDate: '',
                                    mainBranches: [],
                                    subBranches: [],
                                    customerCategories: [],
                                    zones: [],
                                    categories: dashboardFilters?.categories || []
                                });
                            }} className="hover:text-red-900 dark:hover:text-white"><XMarkIcon className="w-4 h-4"/></button>
                         </div>
                    )}
                    <button
                        onClick={() => exportToCSV(filteredAndSortedPOs)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export to Excel
                    </button>
                    {selectedPOIds.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-900 transition-all animate-in fade-in slide-in-from-right-4"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Delete ({selectedPOIds.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-auto rounded-lg shadow-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                {viewMode === 'orders' ? (
                    <table className="w-full text-left text-base text-slate-500 dark:text-slate-400">
                        <thead className="text-sm text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="p-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                        checked={filteredAndSortedPOs.length > 0 && selectedPOIds.length === filteredAndSortedPOs.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('poNumber')}>PO Number {getSortIndicator('poNumber')}</th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('customerName')}>Customer {getSortIndicator('customerName')}</th>
                                <th scope="col" className="p-4">Category / Zone</th>
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
                                const stats = getItemStats(po.filteredItems);
                                const totalItems = po.filteredItems.length;
                                return (
                                    <tr key={po.id} className={`border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedPOIds.includes(po.id) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                                                checked={selectedPOIds.includes(po.id)}
                                                onChange={() => toggleSelectPO(po.id)}
                                            />
                                        </td>
                                        <td className="p-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{po.poNumber}</td>
                                        <td className="p-4">{po.customerName}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{po.customerCategory || 'N/A'}</span>
                                                <span className="text-[10px] text-slate-500">{po.zone || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">{po.mainBranch}{po.subBranch && ` / ${po.subBranch}`}</td>
                                        <td className="p-4">{formatDate(po.poDate)}</td>
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
                ) : (
                    <table className="w-full text-left text-base text-slate-500 dark:text-slate-400">
                        <thead className="text-sm text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="p-4">Part Number</th>
                                <th scope="col" className="p-4">Description</th>
                                <th scope="col" className="p-4">Status</th>
                                <th scope="col" className="p-4 text-right">Qty</th>
                                <th scope="col" className="p-4 text-right">Value</th>
                                <th scope="col" className="p-4 text-center">PO Count</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800/50">
                            {partsBreakdown.map((part, idx) => (
                                <tr key={idx} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{part.partNumber}</td>
                                    <td className="p-4">{part.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${part.status === 'available' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {part.status === 'available' ? 'Available' : 'Not Available'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold">{part.quantity}</td>
                                    <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">
                                        {part.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </td>
                                    <td className="p-4 text-center font-medium">{part.poCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
