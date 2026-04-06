
import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { PurchaseOrder, POItem } from '../types';
import { POItemStatus } from '../types';
import { ChartPieIcon, UserGroupIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, ChevronDownIcon, XMarkIcon } from './icons';
import { exportDataToCSV } from '../utils/export';
import { ITEM_CATEGORIES } from '../constants';
import { formatToCr, truncateToTwoDecimals } from '../utils/currencyUtils';
import { normalizeToAllowedValue, normalizeEnum } from '../utils/stringUtils';

interface TopCustomersPaneProps {
    purchaseOrders: PurchaseOrder[];
}

interface CustomerAnalysis {
    customerName: string;
    totalValue: number;
    poCount: number;
}

const TopCustomersPane: React.FC<TopCustomersPaneProps> = ({ purchaseOrders }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev => 
            prev.includes(status) 
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const { customerAnalysis, totalActiveValue, top50TotalValue } = useMemo(() => {
        const analysisMap: Record<string, CustomerAnalysis> = {};
        let totalActiveValue = 0;

        purchaseOrders.forEach(po => {
            const poValue = (po.items || []).reduce((acc, item) => acc + (item.quantity || 0) * (item.rate || 0), 0);
            totalActiveValue += poValue;

            // Inclusive category check: PO must contain at least one selected category
            if (selectedCategories.length > 0) {
                const hasMatchingCategory = (po.items || []).some(item => selectedCategories.includes(item.category || ''));
                if (!hasMatchingCategory) return;
            }

            const filteredItems = (po.items || []).filter(item => {
                const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
                const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category || '');
                return matchesStatus && matchesCategory;
            });

            if (filteredItems.length === 0) return;

            const customer = (po.customerName || 'Unknown Customer').trim();
            const key = customer.toLowerCase();
            if (!analysisMap[key]) {
                analysisMap[key] = {
                    customerName: customer,
                    totalValue: 0,
                    poCount: 0
                };
            }

            const analysis = analysisMap[key];
            analysis.poCount += 1;

            filteredItems.forEach(item => {
                const itemValue = (item.quantity || 0) * (item.rate || 0);
                analysis.totalValue += itemValue;
            });
        });

        const sorted = Object.values(analysisMap)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 50);
        
        const top50TotalValue = sorted.reduce((acc, a) => acc + a.totalValue, 0);

        return {
            customerAnalysis: sorted,
            totalActiveValue,
            top50TotalValue
        };
    }, [purchaseOrders, selectedCategories, selectedStatuses]);

    const filteredAnalysis = useMemo(() => {
        if (!searchTerm) return customerAnalysis;
        return customerAnalysis.filter(a => 
            a.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customerAnalysis, searchTerm]);

    const contributionPercentage = totalActiveValue > 0 ? (top50TotalValue / totalActiveValue) * 100 : 0;

    const handleExport = () => {
        const exportData = filteredAnalysis.map(a => ({
            'Customer Name': a.customerName,
            'Total Value': truncateToTwoDecimals(a.totalValue).toFixed(2),
            'PO Count': a.poCount
        }));
        exportDataToCSV(exportData, `Top_50_Customers_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <UserGroupIcon className="w-7 h-7 text-red-500" />
                        Top 50 Customer
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                        <p className="text-slate-500 dark:text-slate-400">
                            Analysis of top 50 customers by total order value.
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-full">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Total Value:</span>
                            <span className="text-sm font-black text-red-700 dark:text-red-300">{formatToCr(top50TotalValue)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Contribution:</span>
                            <span className="text-sm font-black text-blue-700 dark:text-blue-300">{contributionPercentage.toFixed(1)}% of Total POs</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

                    <div className="relative flex-1 md:w-48" ref={statusDropdownRef}>
                        <button
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-left text-sm"
                        >
                            <span className="truncate">
                                {selectedStatuses.length === 0 
                                    ? 'All Statuses' 
                                    : `${selectedStatuses.length} Statuses`}
                            </span>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isStatusDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">Item Status</span>
                                    {selectedStatuses.length > 0 && (
                                        <button 
                                            onClick={() => setSelectedStatuses([])}
                                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {Object.values(POItemStatus).map(status => (
                                    <label key={status} className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedStatuses.includes(status)}
                                            onChange={() => toggleStatus(status)}
                                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 mr-3"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{status}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search customer..."
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

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Rank</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer Name</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">Total Value</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">POs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredAnalysis.map((analysis, index) => (
                                    <tr key={analysis.customerName} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">#{index + 1}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{analysis.customerName}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-red-600 dark:text-red-400 text-right">
                                            {formatToCr(analysis.totalValue)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-slate-600 dark:text-slate-300">{analysis.poCount}</td>
                                    </tr>
                                ))}
                                {filteredAnalysis.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No customers found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopCustomersPane;
