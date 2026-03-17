
import React, { useMemo, useState } from 'react';
import type { PurchaseOrder, POItem } from '../types';
import { POItemStatus, OrderStatus } from '../types';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, ListBulletIcon, ChevronDownIcon } from './icons';
import { exportDataToCSV } from '../utils/export';
import { ITEM_CATEGORIES } from '../constants';

interface ItemAvailabilityPaneProps {
    purchaseOrders: PurchaseOrder[];
}

interface ItemAnalysis {
    partNumber: string;
    description: string;
    category: string;
    totalQty: number;
    totalValue: number;
    availableValue: number;
    notAvailableValue: number;
    partiallyAvailableValue: number;
    poCount: number;
    customers: Set<string>;
}

const ItemAvailabilityPane: React.FC<ItemAvailabilityPaneProps> = ({ purchaseOrders }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Not Available' | 'Shortage'>('All');
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const itemAnalysis = useMemo(() => {
        const analysisMap: Record<string, ItemAnalysis> = {};

        purchaseOrders.forEach(po => {
            if (po.orderStatus === OrderStatus.Invoiced) return;
            po.items.forEach(item => {
                const category = item.category || 'Uncategorized';
                
                // Category Filter
                if (selectedCategories.length > 0 && !selectedCategories.includes(category)) return;

                const key = item.partNumber;
                if (!analysisMap[key]) {
                    analysisMap[key] = {
                        partNumber: item.partNumber,
                        description: item.itemDesc || 'N/A',
                        category: category,
                        totalQty: 0,
                        totalValue: 0,
                        availableValue: 0,
                        notAvailableValue: 0,
                        partiallyAvailableValue: 0,
                        poCount: 0,
                        customers: new Set()
                    };
                }

                const analysis = analysisMap[key];
                const itemValue = (item.quantity || 0) * (item.rate || 0);
                
                analysis.totalQty += item.quantity || 0;
                analysis.totalValue += itemValue;
                analysis.poCount += 1;
                if (po.customerName) analysis.customers.add(po.customerName);

                if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                    analysis.availableValue += itemValue;
                } else if (item.status === POItemStatus.NotAvailable) {
                    analysis.notAvailableValue += itemValue;
                } else if (item.status === POItemStatus.PartiallyAvailable) {
                    analysis.partiallyAvailableValue += itemValue;
                }
            });
        });

        return Object.values(analysisMap).sort((a, b) => b.totalValue - a.totalValue);
    }, [purchaseOrders, selectedCategories]);

    const filteredItems = useMemo(() => {
        return itemAnalysis.filter(item => {
            const matchesSearch = 
                item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            if (statusFilter === 'Available') return Math.abs(item.availableValue - item.totalValue) < 0.01;
            if (statusFilter === 'Not Available') return Math.abs(item.notAvailableValue - item.totalValue) < 0.01;
            if (statusFilter === 'Shortage') return item.notAvailableValue > 0 || item.partiallyAvailableValue > 0;

            return true;
        });
    }, [itemAnalysis, searchTerm, statusFilter]);

    const handleExport = () => {
        const exportData = filteredItems.map(item => ({
            'Part Number': item.partNumber,
            'Description': item.description,
            'Category': item.category,
            'Total Qty': item.totalQty,
            'Total Value': item.totalValue.toFixed(2),
            'Available Value': item.availableValue.toFixed(2),
            'Not Available Value': item.notAvailableValue.toFixed(2),
            'Partially Available Value': item.partiallyAvailableValue.toFixed(2),
            'PO Count': item.poCount,
            'Customer Count': item.customers.size
        }));
        exportDataToCSV(exportData, `Item_Availability_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ListBulletIcon className="w-7 h-7 text-red-500" />
                        Item Status Availability
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Comprehensive breakdown of item availability across all purchase orders.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 p-1">
                        {(['All', 'Available', 'Not Available', 'Shortage'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    statusFilter === s 
                                        ? 'bg-red-500 text-white shadow-sm' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 md:w-48" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-left text-sm"
                        >
                            <span className="truncate">
                                {selectedCategories.length === 0 
                                    ? 'All Categories' 
                                    : `${selectedCategories.length} Categories`}
                            </span>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">Categories</span>
                                    {selectedCategories.length > 0 && (
                                        <button 
                                            onClick={() => setSelectedCategories([])}
                                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {ITEM_CATEGORIES.map(cat => (
                                    <label key={cat} className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.includes(cat)}
                                            onChange={() => toggleCategory(cat)}
                                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 mr-3"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{cat}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search part or desc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm text-sm"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Part Number</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Description</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Category</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">Total Qty</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">Total Value</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right text-green-600 dark:text-green-400">Available Value</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right text-red-600 dark:text-red-400">Not Avail. Value</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right text-amber-600 dark:text-amber-400">Partial Value</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">POs</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">Cust.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredItems.map((item) => (
                                <tr key={item.partNumber} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono font-medium text-slate-800 dark:text-slate-100">{item.partNumber}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={item.description}>
                                        {item.description}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center font-bold text-slate-700 dark:text-slate-200">{item.totalQty}</td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-red-600 dark:text-red-400">
                                        {item.totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                                        {item.availableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                                        {item.notAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-amber-600 dark:text-amber-400 font-medium">
                                        {item.partiallyAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-slate-500 dark:text-slate-400">{item.poCount}</td>
                                    <td className="px-6 py-4 text-sm text-center text-slate-500 dark:text-slate-400">{item.customers.size}</td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No items found matching your criteria.
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

export default ItemAvailabilityPane;
