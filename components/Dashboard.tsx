
import React, { useMemo } from 'react';
import type { PurchaseOrder } from '../types';
import { OverallPOStatus, FulfillmentStatus, OrderStatus, POItemStatus, CustomerCategory } from '../types';
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, TruckIcon, UserGroupIcon, XMarkIcon, ChartPieIcon, CalendarDaysIcon, CurrencyRupeeIcon, NoSymbolIcon, ArrowUpIcon, ArrowDownIcon, SparklesIcon, BeakerIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE, ITEM_CATEGORIES, CUSTOMER_CATEGORIES, ZONES, SALE_TYPES } from '../constants';
import { isOilItem, isOilStuckPO, getPOFulfillmentStatus, getPOValue } from '../utils/poUtils';
import { isDateInRange } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { normalizeToAllowedValue, normalizeEnum } from '../utils/stringUtils';

interface DashboardProps {
  purchaseOrders: PurchaseOrder[];
  filters: {
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
  setFilters: React.Dispatch<React.SetStateAction<{
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
  customers: string[];
  onCardClick?: (type: string, value?: string, category?: string) => void;
}

interface TrendData {
    value: number;
    percent: number;
    text: string;
    isPositiveGood: boolean;
}

const DashboardStatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ReactNode; indicatorColor?: string; trend?: TrendData | null; onClick?: () => void }> = ({ title, value, subValue, icon, indicatorColor, trend, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex items-center space-x-4 relative overflow-hidden transition-transform duration-200 ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95' : ''}`}
    >
        {indicatorColor && (
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${indicatorColor}`}></div>
        )}
        <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                {title}
                {indicatorColor && <span className={`w-2 h-2 rounded-full ${indicatorColor}`}></span>}
            </p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                {subValue && (
                    <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                        {subValue}
                    </p>
                )}
            </div>
            {trend && trend.percent !== 0 && (
                 <div className={`flex items-center gap-1 text-sm font-semibold mt-1 ${
                     trend.value > 0 
                        ? (trend.isPositiveGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                        : (trend.isPositiveGood ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
                 }`}>
                     {trend.value > 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                     <span>{Math.abs(trend.percent).toFixed(1)}% MOM</span>
                 </div>
            )}
             {trend && trend.percent === 0 && (
                <div className="text-sm text-slate-400 mt-1 font-medium">
                     No change MOM
                </div>
            )}
        </div>
    </div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ${className}`}>
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ChartPieIcon className="w-5 h-5 text-primary" /> {title}
        </h3>
        {children}
    </div>
);


const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; onSegmentClick?: (label: string) => void; isCurrency?: boolean }> = ({ data, onSegmentClick, isCurrency = true }) => {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    if (total === 0) {
        return <div className="flex items-center justify-center h-56 text-slate-500">No data to display</div>;
    }
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="relative">
                <svg width="180" height="180" viewBox="0 0 100 100">
                    <g transform="rotate(-90 50 50)">
                        {data.reduce((acc, segment, index) => {
                             const segmentLength = (segment.value / total) * circumference;
                             
                             acc.elements.push(
                                <circle
                                    key={`${segment.label}-${index}`}
                                    cx="50" cy="50" r={radius}
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="15"
                                    strokeDasharray={`${segmentLength} ${circumference}`}
                                    strokeDashoffset={-acc.accumulatedLength}
                                    className={onSegmentClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                                    onClick={() => onSegmentClick?.(segment.label)}
                                >
                                    <title>{segment.label}: {isCurrency ? formatCurrency(segment.value) : segment.value}</title>
                                </circle>
                             );
                             acc.accumulatedLength += segmentLength;
                             return acc;
                        }, { accumulatedLength: 0, elements: [] as React.ReactNode[] }).elements}
                    </g>
                     <text x="50" y="50" textAnchor="middle" dy=".3em" className="text-lg font-bold fill-current text-slate-800 dark:text-slate-100">
                       {isCurrency 
                        ? formatCurrency(total, { notation: 'compact' })
                        : total.toLocaleString()}
                    </text>
                </svg>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {data.filter(d => d.value > 0).map((segment, index) => (
                    <div 
                        key={`${segment.label}-${index}`} 
                        className={`flex items-center text-sm ${onSegmentClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded transition-colors' : ''}`}
                        onClick={() => onSegmentClick?.(segment.label)}
                    >
                        <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: segment.color }}></span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate mr-4">{segment.label}</span>
                        <span className="ml-auto font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {((segment.value / total) * 100).toFixed(1)}% ({isCurrency ? formatCurrency(segment.value, { notation: 'compact' }) : segment.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HorizontalBarChart: React.FC<{ data: { label: string; value: number }[], isCurrency?: boolean }> = ({ data, isCurrency = false }) => {
    if (data.length === 0) {
       return <div className="flex items-center justify-center h-full text-slate-500">No data to display</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const formatValue = (val: number) => isCurrency
        ? formatCurrency(val, { notation: 'compact' })
        : val.toLocaleString();
        
    return (
        <div className="space-y-4 pr-4">
            {data.map((item, index) => (
                <div key={`${item.label}-${index}`} className="space-y-1.5">
                     <div className="flex justify-between text-base font-medium text-slate-600 dark:text-slate-300">
                        <span title={item.label} className="truncate">{item.label}</span>
                        <span>{formatValue(item.value)}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full"
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

const BreakdownModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    data: { label: string; value: number; color: string }[];
    onViewOrders: (category?: string) => void;
}> = ({ isOpen, onClose, title, data, onViewOrders }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ChartPieIcon className="w-6 h-6 text-red-500" />
                        {title} - Category Breakdown
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="p-8">
                    <DonutChart data={data} onSegmentClick={(label) => onViewOrders(label)} />
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={() => onViewOrders()}
                        className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                    >
                        View Detailed Orders
                    </button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ purchaseOrders, filters, setFilters, customers, onCardClick }) => {
    const [selectedBreakdown, setSelectedBreakdown] = React.useState<{ type: string, title: string } | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleFilter = (key: 'statuses' | 'mainBranches' | 'subBranches' | 'categories' | 'customerCategories' | 'zones', value: string) => {
        setFilters(prev => {
            const current = prev[key] || [];
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            
            // If main branch is deselected, also deselect its sub-branches
            if (key === 'mainBranches' && current.includes(value)) {
                const subsToRemove = BRANCH_STRUCTURE[value] || [];
                return {
                    ...prev,
                    mainBranches: next,
                    subBranches: prev.subBranches.filter(sb => !subsToRemove.includes(sb))
                };
            }
            
            return { ...prev, [key]: next };
        });
    };

    const toggleCategory = (category: string) => toggleFilter('categories', category);
    const toggleCustomerCategory = (category: string) => toggleFilter('customerCategories', category);
    const toggleZone = (zone: string) => toggleFilter('zones', zone);
    const toggleStatus = (status: string) => toggleFilter('statuses', status);
    const toggleMainBranch = (branch: string) => toggleFilter('mainBranches', branch);
    const toggleSubBranch = (branch: string) => toggleFilter('subBranches', branch);

    const filteredPOs = useMemo(() => {
        return purchaseOrders
            .filter(po => filters.statuses.length > 0 ? filters.statuses.includes(po.status) : true)
            .filter(po => filters.customer ? (po.customerName || '').toLowerCase().includes(filters.customer.toLowerCase()) : true)
            .filter(po => isDateInRange(po.poDate, filters.startDate, filters.endDate))
            .filter(po => filters.mainBranches.length > 0 ? filters.mainBranches.includes(po.mainBranch || '') : true)
            .filter(po => filters.subBranches.length > 0 ? filters.subBranches.includes(po.subBranch || '') : true)
            .filter(po => filters.customerCategories.length > 0 ? filters.customerCategories.includes(po.customerCategory || '') : true)
            .filter(po => filters.zones.length > 0 ? filters.zones.includes(po.zone || '') : true)
            .filter(po => {
                if (!filters.categories || filters.categories.length === 0) return true;
                return (po.items || []).some(item => filters.categories.includes(item.category));
            });
    }, [purchaseOrders, filters]);

    const activePOs = useMemo(() => filteredPOs.filter(po => po.orderStatus !== OrderStatus.Invoiced), [filteredPOs]);
    const invoicedPOs = useMemo(() => filteredPOs.filter(po => po.orderStatus === OrderStatus.Invoiced), [filteredPOs]);

    const getTrend = (
        allPOs: PurchaseOrder[], 
        currentFilters: typeof filters, 
        filterFn: (po: PurchaseOrder) => boolean,
        valueFn: (pos: PurchaseOrder[]) => number,
        isPositiveGood: boolean = true
    ): TrendData | null => {
        const contextPOs = allPOs.filter(po => {
            if (currentFilters.customer && !(po.customerName || '').toLowerCase().includes(currentFilters.customer.toLowerCase())) return false;
            if (currentFilters.mainBranches.length > 0 && !currentFilters.mainBranches.includes(po.mainBranch || '')) return false;
            if (currentFilters.subBranches.length > 0 && !currentFilters.subBranches.includes(po.subBranch || '')) return false;
            if (currentFilters.customerCategories.length > 0 && !currentFilters.customerCategories.includes(po.customerCategory || '')) return false;
            if (currentFilters.zones.length > 0 && !currentFilters.zones.includes(po.zone || '')) return false;
            if (currentFilters.categories && currentFilters.categories.length > 0) {
                if (!(po.items || []).some(item => currentFilters.categories.includes(item.category))) return false;
            }
            return true;
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        const thisMonthPOs = contextPOs.filter(po => {
            const d = new Date(po.poDate);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const lastMonthPOs = contextPOs.filter(po => {
            const d = new Date(po.poDate);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });

        const thisMonthMetricPOs = thisMonthPOs.filter(filterFn);
        const lastMonthMetricPOs = lastMonthPOs.filter(filterFn);

        const thisVal = valueFn(thisMonthMetricPOs);
        const lastVal = valueFn(lastMonthMetricPOs);

        if (lastVal === 0 || isNaN(lastVal)) {
            return (thisVal === 0 || isNaN(thisVal)) ? { value: 0, percent: 0, text: '0% MOM', isPositiveGood } : { value: 100, percent: 100, text: '100% MOM', isPositiveGood };
        }
        
        const diff = thisVal - lastVal;
        const percent = (diff / lastVal) * 100;
        return { value: percent, percent, text: `${Math.abs(percent).toFixed(1)}% MOM`, isPositiveGood };
    };

    const getAvgDays = (pos: PurchaseOrder[], startField: keyof PurchaseOrder, endField: keyof PurchaseOrder): number => {
        const validPOs = pos.filter(p => p[startField] && p[endField]);
        if (validPOs.length === 0) return 0;
        const totalDays = validPOs.reduce((acc, p) => {
            const startDate = new Date(p[startField] as string);
            const endDate = new Date(p[endField] as string);
            if(isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return acc;
            const diff = Math.abs(endDate.getTime() - startDate.getTime());
            return acc + Math.ceil(diff / (1000 * 3600 * 24));
        }, 0);
        return totalDays / validPOs.length;
    };


    const dashboardData = useMemo(() => {
        const calculateValue = (pos: PurchaseOrder[]) => pos.reduce((acc, po) => acc + getPOValue(po, filters.categories), 0);

        const openPOs = activePOs;
        const totalOpenPOs = openPOs.length;
        const openPOValue = calculateValue(openPOs);
        
        const totalInvoicedPOs = invoicedPOs.length;
        const totalInvoicedValue = calculateValue(invoicedPOs);

        // Partial Invoices PO
        const partialInvoicedPOsList = filteredPOs.filter(po => po.orderStatus === OrderStatus.PartiallyInvoiced);
        const partialInvoicedPOs = partialInvoicedPOsList.length;
        const partialInvoicedValue = calculateValue(partialInvoicedPOsList);

        // 1. 100% Available (Ready to Execute)
        const fullyAvailablePOsList = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.Available);
        const fullyAvailablePOs = fullyAvailablePOsList.length;
        const fullyAvailableValue = calculateValue(fullyAvailablePOsList);

        // 2. Partially Available
        const partiallyAvailablePOsList = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.PartiallyAvailable);
        const partiallyAvailablePOs = partiallyAvailablePOsList.length;
        const partiallyAvailableValue = calculateValue(partiallyAvailablePOsList);
        
        let partialAvailableItemsValue = 0;
        let partialNotAvailableItemsValue = 0;
        partiallyAvailablePOsList.forEach(po => {
            const relevantItems = (po.items || []).filter(item => 
                filters.categories.length === 0 || filters.categories.includes(item.category)
            );
            relevantItems.forEach(item => {
                const itemValue = (Number(item.quantity || 0) * Number(item.rate || 0));
                if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                    partialAvailableItemsValue += itemValue;
                } else {
                    partialNotAvailableItemsValue += itemValue;
                }
            });
        });

        // 3. 100% Not Available
        const notAvailablePOsList = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.NotAvailable);
        const notAvailablePOs = notAvailablePOsList.length;
        const notAvailableValue = calculateValue(notAvailablePOsList);

        // 5. Oil-Stuck POs (All parts available except Oil/Valvoline)
        const oilStuckPOsList = activePOs.filter(isOilStuckPO);
        const oilStuckPOs = oilStuckPOsList.length;
        const oilStuckValue = calculateValue(oilStuckPOsList);

        // 6. Aggregated Unavailable Parts List
        const unavailablePartsMap: Record<string, { partNumber: string, description: string, quantity: number, value: number, poCount: number }> = {};
        activePOs.forEach(po => {
            const relevantItems = (po.items || []).filter(item => 
                filters.categories.length === 0 || filters.categories.includes(item.category)
            );
            relevantItems.forEach(item => {
                if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                    const key = item.partNumber;
                    if (!unavailablePartsMap[key]) {
                        unavailablePartsMap[key] = {
                            partNumber: item.partNumber,
                            description: item.itemDesc || 'N/A',
                            quantity: 0,
                            value: 0,
                            poCount: 0
                        };
                    }
                    unavailablePartsMap[key].quantity += item.quantity;
                    unavailablePartsMap[key].value += (item.quantity * item.rate);
                    unavailablePartsMap[key].poCount += 1;
                }
            });
        });
        const unavailablePartsList = Object.values(unavailablePartsMap).sort((a, b) => b.value - a.value);

        // Trends
        const openTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced, p => p.length, true);
        const valueTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced, p => calculateValue(p), true);
        const fullyTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.Available, p => p.length, true);
        const partialTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.PartiallyAvailable, p => p.length, true);
        const notAvailableTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.NotAvailable, p => p.length, false);
        const invoicedTrend = getTrend(purchaseOrders, filters, p => p.orderStatus === OrderStatus.Invoiced, p => p.length, true);

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

        const checklistDataRaw: Record<string, number> = {};
        ITEM_CATEGORIES.forEach(cat => {
            checklistDataRaw[cat] = activePOs.filter(po => 
                (po.items || []).some(item => normalizeToAllowedValue(item.category, ITEM_CATEGORIES) === cat)
            ).length;
        });
        const checklistColors: Record<string, string> = { 
            'B-Check': '#34d399', 
            'C-Check': '#f59e0b', 
            'D-Check': '#ef4444', 
            'Battery': '#6366f1',
            'Spares': '#8b5cf6',
            'BD': '#ec4899',
            'Radiator': '#14b8a6',
            'Others': '#9ca3af' 
        };
        const checklistChartData = Object.entries(checklistDataRaw)
            .filter(([_, value]) => value > 0)
            .map(([label, value]) => ({ 
                label, 
                value, 
                color: checklistColors[label] || colors[Math.floor(Math.random() * colors.length)] 
            }))
            .sort((a, b) => b.value - a.value);

        // Customer Category Chart Data
        const customerCategoryDataRaw: Record<string, number> = {
            [CustomerCategory.AMC]: activePOs.filter(po => normalizeEnum(po.customerCategory, CustomerCategory) === CustomerCategory.AMC).length,
            [CustomerCategory.NON_AMC]: activePOs.filter(po => normalizeEnum(po.customerCategory, CustomerCategory) === CustomerCategory.NON_AMC).length,
            [CustomerCategory.NEPI]: activePOs.filter(po => normalizeEnum(po.customerCategory, CustomerCategory) === CustomerCategory.NEPI).length,
        };
        const customerCategoryColors: Record<string, string> = {
            [CustomerCategory.AMC]: '#3b82f6',
            [CustomerCategory.NON_AMC]: '#f59e0b',
            [CustomerCategory.NEPI]: '#10b981',
        };
        const customerCategoryChartData = Object.entries(customerCategoryDataRaw).map(([label, value]) => ({
            label,
            value,
            color: customerCategoryColors[label] || '#9ca3af'
        }));

        const valueByFulfillment = activePOs.reduce((acc, po) => {
            const status = getPOFulfillmentStatus(po, filters.categories);
            const value = getPOValue(po, filters.categories);
            acc[status] = (acc[status] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const fulfillmentColors: Record<string, string> = { 
            [FulfillmentStatus.Available]: '#22c55e', 
            [FulfillmentStatus.PartiallyAvailable]: '#f59e0b', 
            [FulfillmentStatus.NotAvailable]: '#ef4444',
        };
        const fulfillmentChartData = Object.entries(valueByFulfillment).map(([label, value]) => ({ label, value, color: fulfillmentColors[label] || '#9ca3af' }));

        const customerValueMap: Record<string, { name: string, value: number }> = {};
        activePOs.forEach(po => {
            const value = getPOValue(po, filters.categories);
            const name = (po.customerName || 'Unknown').trim();
            const key = name.toLowerCase();
            if (!customerValueMap[key]) {
                customerValueMap[key] = { name, value: 0 };
            }
            customerValueMap[key].value += value;
        });

        const topCustomers = Object.values(customerValueMap)
            .map(item => ({ label: item.name, value: item.value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);
        const top50TotalValue = topCustomers.reduce((acc, c) => acc + c.value, 0);
        const top50Contribution = openPOValue > 0 ? (top50TotalValue / openPOValue) * 100 : 0;

        const valueByPayment = activePOs.reduce((acc, po) => {
            const rawType = po.saleType || 'N/A';
            const type = normalizeToAllowedValue(rawType, SALE_TYPES);
            const value = getPOValue(po, filters.categories);
            acc[type] = (acc[type] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        const countByPayment = activePOs.reduce((acc, po) => {
            const rawType = po.saleType || 'N/A';
            const type = normalizeToAllowedValue(rawType, SALE_TYPES);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const paymentColors = { 
            'Credit': '#3b82f6', 
            'Cash': '#22c55e',
            'Awaiting Payment': '#f59e0b',
            'Advance Payment': '#8b5cf6',
            'Cheque': '#ec4899',
            'RTGS/NEFT': '#14b8a6',
            'PI Sent': '#9ca3af',
            'Received': '#10b981',
            'Payment is Ready with Customer': '#f97316',
            'Amendment': '#6366f1'
        };
        const paymentTermsChartData = Object.entries(valueByPayment).map(([label, value]) => ({ label, value, color: paymentColors[label as keyof typeof paymentColors] || '#9ca3af'}));
        const salesTypeCountChartData = Object.entries(countByPayment).map(([label, value]) => ({ label, value, color: paymentColors[label as keyof typeof paymentColors] || '#9ca3af'}));

        const today = new Date();
        const ageing: Record<string, number> = { '0-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '>90 Days': 0 };
        const ageingValue: Record<string, number> = { '0-30 Days': 0, '31-60 Days': 0, '61-90 Days': 0, '>90 Days': 0 };

        openPOs.forEach(po => {
            const poDate = new Date(po.poDate);
            if (isNaN(poDate.getTime())) return;
            const diffDays = Math.floor((today.getTime() - poDate.getTime()) / (1000 * 3600 * 24));
            const poValue = getPOValue(po, filters.categories);

            if (diffDays <= 30) {
                ageing['0-30 Days']++;
                ageingValue['0-30 Days'] += poValue;
            }
            else if (diffDays <= 60) {
                ageing['31-60 Days']++;
                ageingValue['31-60 Days'] += poValue;
            }
            else if (diffDays <= 90) {
                ageing['61-90 Days']++;
                ageingValue['61-90 Days'] += poValue;
            }
            else {
                ageing['>90 Days']++;
                ageingValue['>90 Days'] += poValue;
            }
        });
        const poAgeingChartData = Object.entries(ageing).map(([label, value]) => ({ label, value }));
        const poAgeingValueChartData = Object.entries(ageingValue).map(([label, value]) => ({ label, value }));

        const valueByBranch = activePOs.reduce((acc, po) => {
            const rawBranch = po.mainBranch || 'Unassigned';
            const branch = normalizeToAllowedValue(rawBranch, MAIN_BRANCHES);
            const value = getPOValue(po, filters.categories);
            acc[branch] = (acc[branch] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const branchPerformanceChartData = Object.entries(valueByBranch).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value));

        const avgPOtoSOVal = getAvgDays(activePOs, 'poDate', 'soDate');
        const avgSOtoInvoiceVal = getAvgDays(activePOs, 'soDate', 'invoiceDate');
        const avgPOtoInvoiceVal = getAvgDays(activePOs, 'poDate', 'invoiceDate');

        const avgPOtoSO = avgPOtoSOVal ? `${Math.round(avgPOtoSOVal)} days` : '0 days';
        const avgSOtoInvoice = avgSOtoInvoiceVal ? `${Math.round(avgSOtoInvoiceVal)} days` : '0 days';
        const avgPOtoInvoice = avgPOtoInvoiceVal ? `${Math.round(avgPOtoInvoiceVal)} days` : '0 days';

        const avgPOtoSOTrend = getTrend(purchaseOrders, filters, p => !!(p.poDate && p.soDate), (pos) => getAvgDays(pos, 'poDate', 'soDate'), false);
        const avgSOtoInvoiceTrend = getTrend(purchaseOrders, filters, p => !!(p.soDate && p.invoiceDate), (pos) => getAvgDays(pos, 'soDate', 'invoiceDate'), false);
        const avgPOtoInvoiceTrend = getTrend(purchaseOrders, filters, p => !!(p.poDate && p.invoiceDate), (pos) => getAvgDays(pos, 'poDate', 'invoiceDate'), false);

        // Oil Required Analysis
        let oilRequiredValue = 0;
        let oilRequiredCount = 0;
        let posClosingWithOilCount = 0;
        let posClosingWithOilValue = 0;

        activePOs.forEach(po => {
            const items = po.items || [];
            const oilItems = items.filter(isOilItem);
            const nonOilItems = items.filter(i => !isOilItem(i));
            
            const hasOilShortage = oilItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
            
            if (hasOilShortage) {
                oilItems.forEach(i => {
                    if (i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable) {
                        oilRequiredValue += (i.quantity * i.rate);
                        oilRequiredCount++;
                    }
                });

                // Check if providing oil would close the PO (all other items must be available)
                const allOtherItemsAvailable = nonOilItems.every(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched);
                if (allOtherItemsAvailable && nonOilItems.length > 0) {
                    posClosingWithOilCount++;
                    posClosingWithOilValue += getPOValue(po, filters.categories);
                }
            }
        });

        const readyToExecuteSalesTypeTotals: Record<string, number> = {};
        fullyAvailablePOsList.forEach(po => {
            const type = po.saleType || 'N/A';
            readyToExecuteSalesTypeTotals[type] = (readyToExecuteSalesTypeTotals[type] || 0) + 1;
        });
        const readyToExecuteChartData = Object.entries(readyToExecuteSalesTypeTotals)
            .filter(([_, value]) => value > 0)
            .map(([label, value], index) => ({
                label,
                value,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);

        return { 
            totalOpenPOs, openPOValue: isNaN(openPOValue) ? 0 : openPOValue, 
            fullyAvailablePOs, fullyAvailableValue: isNaN(fullyAvailableValue) ? 0 : fullyAvailableValue, 
            partiallyAvailablePOs, partiallyAvailableValue: isNaN(partiallyAvailableValue) ? 0 : partiallyAvailableValue, 
            partialAvailableItemsValue,
            partialNotAvailableItemsValue,
            notAvailablePOs, notAvailableValue: isNaN(notAvailableValue) ? 0 : notAvailableValue,
            totalNotAvailableValue: partialNotAvailableItemsValue + notAvailableValue,
            oilStuckPOs, oilStuckValue: isNaN(oilStuckValue) ? 0 : oilStuckValue,
            oilStuckPOsList,
            oilRequiredValue, oilRequiredCount,
            posClosingWithOilCount, posClosingWithOilValue,
            unavailablePartsList,
            checklistChartData, fulfillmentChartData, topCustomers, paymentTermsChartData, salesTypeCountChartData,
            readyToExecuteChartData, customerCategoryChartData,
            poAgeingChartData, poAgeingValueChartData, branchPerformanceChartData,
            avgPOtoSO, avgSOtoInvoice, avgPOtoInvoice,
            openTrend, valueTrend, fullyTrend, partialTrend, notAvailableTrend,
            avgPOtoSOTrend, avgSOtoInvoiceTrend, avgPOtoInvoiceTrend,
            totalInvoicedPOs, totalInvoicedValue, invoicedTrend,
            partialInvoicedPOs, partialInvoicedValue,
            top50TotalValue, top50Contribution
        };
    }, [activePOs, invoicedPOs, purchaseOrders, filters]);

    const getBreakdownData = (type: string) => {
        let pos: PurchaseOrder[] = [];
        let isGap = false;

        if (type === 'OPEN') pos = activePOs;
        else if (type === 'FULLY_AVAILABLE') pos = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.Available);
        else if (type === 'PARTIALLY_AVAILABLE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.PartiallyAvailable);
            isGap = true;
        }
        else if (type === 'NOT_AVAILABLE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.NotAvailable);
            isGap = true;
        }
        else if (type === 'ANY_SHORTAGE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po, filters.categories) !== FulfillmentStatus.Available);
            isGap = true;
        }
        else if (type === 'OIL_STUCK') pos = activePOs.filter(isOilStuckPO);
        else if (type === 'INVOICED') pos = invoicedPOs;
        else if (type === 'PARTIAL_INVOICED') pos = filteredPOs.filter(po => po.orderStatus === OrderStatus.PartiallyInvoiced);
        else if (type === 'GAP') {
            pos = activePOs;
            isGap = true;
        }

        const categoryTotals: Record<string, number> = {};
        ITEM_CATEGORIES.forEach(cat => categoryTotals[cat] = 0);

        pos.forEach(po => {
            (po.items || []).forEach(item => {
                const normalizedCategory = normalizeToAllowedValue(item.category, ITEM_CATEGORIES) || 'Others';
                if (filters.categories.length > 0 && !filters.categories.includes(normalizedCategory)) return;
                
                const val = (Number(item.quantity || 0) * Number(item.rate || 0));
                
                if (isGap) {
                    if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                        categoryTotals[normalizedCategory] = (categoryTotals[normalizedCategory] || 0) + val;
                    }
                } else {
                    categoryTotals[normalizedCategory] = (categoryTotals[normalizedCategory] || 0) + val;
                }
            });
        });

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        
        return Object.entries(categoryTotals)
            .filter(([_, value]) => value > 0)
            .map(([label, value], index) => ({
                label,
                value,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label htmlFor="customer" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search Customer</label>
                        <input type="text" id="customer" name="customer" value={filters.customer || ''} onChange={handleFilterChange} list="customer-list" placeholder="Type to search..." className="block w-full text-base px-3 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                         <datalist id="customer-list">
                            {customers.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
                        <div className="flex items-center gap-2">
                            <input type="date" id="startDate" name="startDate" value={filters.startDate || ''} onChange={handleFilterChange} className="block w-full text-sm px-2 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                            <span className="text-slate-400">to</span>
                            <input type="date" id="endDate" name="endDate" value={filters.endDate || ''} onChange={handleFilterChange} className="block w-full text-sm px-2 py-2 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                        </div>
                    </div>
                    <div className="lg:col-span-2 flex items-end justify-end">
                        <button onClick={() => setFilters({statuses: [], customer: '', startDate: '', endDate: '', mainBranches: [], subBranches: [], categories: [], customerCategories: [], zones: []})} className="py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center gap-2 transition-colors">
                           <XMarkIcon className="w-4 h-4" />
                           Reset All Filters
                        </button>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.values(OverallPOStatus).map(s => {
                                const isSelected = filters.statuses.includes(s);
                                return (
                                    <button
                                        key={s}
                                        onClick={() => toggleStatus(s)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isSelected 
                                                ? 'bg-red-500 text-white border-red-500' 
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Main Branches</label>
                        <div className="flex flex-wrap gap-2">
                            {MAIN_BRANCHES.map(b => {
                                const isSelected = filters.mainBranches.includes(b);
                                return (
                                    <button
                                        key={b}
                                        onClick={() => toggleMainBranch(b)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isSelected 
                                                ? 'bg-red-500 text-white border-red-500' 
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                        }`}
                                    >
                                        {b}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {filters.mainBranches.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sub Branches</label>
                            <div className="flex flex-wrap gap-2">
                                {filters.mainBranches.flatMap(mb => BRANCH_STRUCTURE[mb] || []).map(sb => {
                                    const isSelected = filters.subBranches.includes(sb);
                                    return (
                                        <button
                                            key={sb}
                                            onClick={() => toggleSubBranch(sb)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                isSelected 
                                                    ? 'bg-red-500 text-white border-red-500' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                            }`}
                                        >
                                            {sb}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categories</label>
                        <div className="flex flex-wrap gap-2">
                            {ITEM_CATEGORIES.map(cat => {
                                const isSelected = filters.categories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isSelected 
                                                ? 'bg-red-500 text-white border-red-500' 
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Customer Category</label>
                            <div className="flex flex-wrap gap-2">
                                {CUSTOMER_CATEGORIES.map(cat => {
                                    const isSelected = filters.customerCategories.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => toggleCustomerCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                isSelected 
                                                    ? 'bg-red-500 text-white border-red-500' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Zone</label>
                            <div className="flex flex-wrap gap-2">
                                {ZONES.map(z => {
                                    const isSelected = filters.zones.includes(z);
                                    return (
                                        <button
                                            key={z}
                                            onClick={() => toggleZone(z)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                isSelected 
                                                    ? 'bg-red-500 text-white border-red-500' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300'
                                            }`}
                                        >
                                            {z}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ready to Execute / Partial / Not Available Panes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-t-4 border-green-500 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Ready to Execute</p>
                            <p className="text-green-600 dark:text-green-400 text-xs font-medium">
                                {filters.categories.length > 0 
                                    ? `100% of ${filters.categories.join(', ')} Available` 
                                    : '100% Items Available'}
                            </p>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.fullyAvailablePOs}</span>
                        <span className="text-slate-400 font-semibold text-sm">POs</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mb-4">
                        {formatCurrency(dashboardData.fullyAvailableValue, { notation: 'compact' })}
                    </p>
                    <button 
                        onClick={() => onCardClick?.('FULLY_AVAILABLE')}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all active:scale-95 text-sm shadow-md shadow-green-600/20"
                    >
                        View Ready POs
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-t-4 border-amber-500 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">Partially Available</p>
                            <p className="text-amber-600 dark:text-amber-400 text-xs font-medium">Some Items Missing</p>
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.partiallyAvailablePOs}</span>
                        <span className="text-slate-400 font-semibold text-sm">POs</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Value</span>
                            <span className="text-sm font-bold text-amber-600">{formatCurrency(dashboardData.partiallyAvailableValue, { notation: 'compact' })}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/10 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBreakdown({ type: 'PARTIALLY_AVAILABLE', title: 'Partially Available (Missing Items)' });
                            }}
                        >
                            <div className="flex items-center gap-1.5">
                                <ChartPieIcon className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-xs font-bold text-red-600 uppercase">Not Available</span>
                            </div>
                            <span className="text-sm font-bold text-red-600">{formatCurrency(dashboardData.partialNotAvailableItemsValue, { notation: 'compact' })}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => onCardClick?.('PARTIALLY_AVAILABLE')}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all active:scale-95 text-sm shadow-md shadow-amber-600/20"
                    >
                        View Partial POs
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-t-4 border-primary shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">100% Not Available</p>
                            <p className="text-primary dark:text-primary-dark text-xs font-medium">No Items in Stock</p>
                        </div>
                        <div className="bg-primary/10 dark:bg-primary/30 p-2 rounded-lg">
                            <NoSymbolIcon className="w-6 h-6 text-primary dark:text-primary-dark" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.notAvailablePOs}</span>
                        <span className="text-slate-400 font-semibold text-sm">POs</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Total Value</span>
                            <span className="text-sm font-bold text-primary">{formatCurrency(dashboardData.notAvailableValue, { notation: 'compact' })}</span>
                        </div>
                        <div 
                            className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/10 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBreakdown({ type: 'NOT_AVAILABLE', title: '100% Not Available (Missing Items)' });
                            }}
                        >
                            <div className="flex items-center gap-1.5">
                                <ChartPieIcon className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-xs font-bold text-red-600 uppercase">Not Available</span>
                            </div>
                            <span className="text-sm font-bold text-red-600">{formatCurrency(dashboardData.notAvailableValue, { notation: 'compact' })}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => onCardClick?.('NOT_AVAILABLE')}
                        className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all active:scale-95 text-sm shadow-md shadow-primary/20"
                    >
                        View Missing POs
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardStatCard 
                    title="Total No of PO's" 
                    value={dashboardData.totalOpenPOs} 
                    subValue={`${dashboardData.partialInvoicedPOs} Partially Invoiced`}
                    icon={<ClockIcon className="w-6 h-6 text-amber-500" />} 
                    indicatorColor="bg-amber-500"
                    trend={dashboardData.openTrend}
                    onClick={() => setSelectedBreakdown({ type: 'OPEN', title: "Total No of PO's" })}
                />
                <DashboardStatCard 
                    title="Active PO Value" 
                    value={formatCurrency(dashboardData.openPOValue, { notation: 'compact' })} 
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-primary" />} 
                    indicatorColor="bg-primary"
                    trend={dashboardData.valueTrend}
                    onClick={() => setSelectedBreakdown({ type: 'OPEN', title: "Active PO Value" })}
                />
                <DashboardStatCard 
                    title="Partial Invoices PO" 
                    value={formatCurrency(dashboardData.partialInvoicedValue, { notation: 'compact' })} 
                    subValue={`${dashboardData.partialInvoicedPOs} POs`}
                    icon={<SparklesIcon className="w-6 h-6 text-purple-500" />} 
                    indicatorColor="bg-purple-500"
                    onClick={() => setSelectedBreakdown({ type: 'PARTIAL_INVOICED', title: "Partial Invoices PO" })}
                />
                <DashboardStatCard 
                    title="Invoiced POs" 
                    value={formatCurrency(dashboardData.totalInvoicedValue, { notation: 'compact' })} 
                    subValue={`${dashboardData.totalInvoicedPOs} POs`}
                    icon={<CheckCircleIcon className="w-6 h-6 text-slate-500" />} 
                    indicatorColor="bg-slate-500"
                    trend={dashboardData.invoicedTrend}
                    onClick={() => setSelectedBreakdown({ type: 'INVOICED', title: "Invoiced POs" })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <DashboardStatCard 
                    title="Ready to Execute" 
                    value={formatCurrency(dashboardData.fullyAvailableValue, { notation: 'compact' })} 
                    subValue={`${dashboardData.fullyAvailablePOs} POs`}
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} 
                    indicatorColor="bg-green-500"
                    trend={dashboardData.fullyTrend}
                    onClick={() => setSelectedBreakdown({ type: 'FULLY_AVAILABLE', title: "Ready to Execute" })}
                />
                <DashboardStatCard 
                    title="Partially Available" 
                    value={formatCurrency(dashboardData.partiallyAvailableValue, { notation: 'compact' })} 
                    subValue={`Avail: ${formatCurrency(dashboardData.partialAvailableItemsValue, { notation: 'compact' })} | Gap: ${formatCurrency(dashboardData.partialNotAvailableItemsValue, { notation: 'compact' })} | ${dashboardData.partiallyAvailablePOs} POs`}
                    icon={<TruckIcon className="w-6 h-6 text-blue-500" />} 
                    indicatorColor="bg-blue-500"
                    trend={dashboardData.partialTrend}
                    onClick={() => setSelectedBreakdown({ type: 'PARTIALLY_AVAILABLE', title: "Partially Available" })}
                />
                <DashboardStatCard 
                    title="100% Not Available" 
                    value={formatCurrency(dashboardData.notAvailableValue, { notation: 'compact' })} 
                    subValue={`${dashboardData.notAvailablePOs} POs`}
                    icon={<NoSymbolIcon className="w-6 h-6 text-red-600" />} 
                    indicatorColor="bg-red-600"
                    trend={dashboardData.notAvailableTrend}
                    onClick={() => setSelectedBreakdown({ type: 'NOT_AVAILABLE', title: "100% Not Available" })}
                />
            </div>

            {/* Detailed Fulfillment Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border-t-4 border-amber-500 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
                                <BeakerIcon className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Oil Required Analysis</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Oil Required</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(dashboardData.oilRequiredValue, { notation: 'compact' })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Oil Item Count</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{dashboardData.oilRequiredCount} Items</span>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-2 tracking-widest">Impact Analysis</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">POs closing with Oil</span>
                                    <span className="font-bold text-green-600">{dashboardData.posClosingWithOilCount} POs</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Value to Unlock</span>
                                    <span className="font-bold text-green-600">{formatCurrency(dashboardData.posClosingWithOilValue, { notation: 'compact' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setSelectedBreakdown({ type: 'GAP', title: "Total Not Available Value" })}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <NoSymbolIcon className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Not Available Value</h3>
                            <div className="p-2 bg-primary rounded-lg">
                                <NoSymbolIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-black text-white">
                                {formatCurrency(dashboardData.totalNotAvailableValue, { notation: 'compact' })}
                            </p>
                            <p className="text-sm font-bold text-primary uppercase">Total Gap</p>
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Combined value of <span className="text-primary font-bold">all missing items</span> across Partial and 100% Not Available POs.
                        </p>
                    </div>
                </div>

                <div 
                    onClick={() => setSelectedBreakdown({ type: 'OIL_STUCK', title: "Oil-Stuck POs" })}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between"
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <BeakerIcon className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Oil-Stuck POs</h3>
                            <div className="p-2 bg-primary-dark rounded-lg">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-black text-white">{dashboardData.oilStuckPOs}</p>
                            <p className="text-sm font-bold text-primary uppercase">POs</p>
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Orders where <span className="text-green-400 font-bold">all parts are available</span> except for <span className="text-primary font-bold">Valvoline Oil</span>.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-white/10 px-3 py-2 rounded-lg w-fit">
                            <CurrencyRupeeIcon className="w-4 h-4 text-primary" />
                            Value: {formatCurrency(dashboardData.oilStuckValue, { notation: 'compact' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <DashboardStatCard 
                    title="Avg. PO → SO" 
                    value={dashboardData.avgPOtoSO} 
                    icon={<CalendarDaysIcon className="w-6 h-6 text-indigo-500" />} 
                    trend={dashboardData.avgPOtoSOTrend}
                 />
                 <DashboardStatCard 
                    title="Avg. SO → Invoice" 
                    value={dashboardData.avgSOtoInvoice} 
                    icon={<CalendarDaysIcon className="w-6 h-6 text-indigo-500" />} 
                    trend={dashboardData.avgSOtoInvoiceTrend}
                 />
                 <DashboardStatCard 
                    title="Avg. PO → Invoice" 
                    value={dashboardData.avgPOtoInvoice} 
                    icon={<CalendarDaysIcon className="w-6 h-6 text-indigo-500" />} 
                    trend={dashboardData.avgPOtoInvoiceTrend}
                 />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                 <ChartContainer title="Value by Payment Terms">
                    <DonutChart 
                        data={dashboardData.paymentTermsChartData} 
                        onSegmentClick={(label) => onCardClick?.('SALE_TYPE', label)}
                    />
                 </ChartContainer>
                 <ChartContainer title="Ready to Execute Breakdown (by Sales Type) - PO Count">
                    <DonutChart 
                        data={dashboardData.readyToExecuteChartData} 
                        isCurrency={false}
                        onSegmentClick={(label) => onCardClick?.('FULLY_AVAILABLE', label)}
                    />
                 </ChartContainer>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                 <ChartContainer title="Fulfillment Status (by Value)">
                    <DonutChart data={dashboardData.fulfillmentChartData} />
                 </ChartContainer>
                 <ChartContainer title="Category Wise (PO Count)">
                    <DonutChart data={dashboardData.checklistChartData} isCurrency={false} />
                 </ChartContainer>
                 <ChartContainer title="Customer Category">
                    <DonutChart data={dashboardData.customerCategoryChartData} isCurrency={false} />
                 </ChartContainer>
                 <ChartContainer title="Active PO Ageing (by PO Count)">
                    <HorizontalBarChart data={dashboardData.poAgeingChartData} />
                 </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                 <ChartContainer title="Active PO Ageing (by Value)">
                    <HorizontalBarChart data={dashboardData.poAgeingValueChartData} isCurrency />
                 </ChartContainer>
                 <ChartContainer title="Branch Performance (by Value)">
                    <HorizontalBarChart data={dashboardData.branchPerformanceChartData} isCurrency />
                 </ChartContainer>
                 <ChartContainer title="Top 50 Customers" className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                       <div>
                           <p className="text-xs font-bold text-slate-500 uppercase">Total Top 50 Value</p>
                           <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(dashboardData.top50TotalValue)}</p>
                       </div>
                       <div className="text-right">
                           <p className="text-xs font-bold text-slate-500 uppercase">Contribution %</p>
                           <p className="text-lg font-bold text-red-600">{dashboardData.top50Contribution.toFixed(1)}%</p>
                       </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                       <HorizontalBarChart data={dashboardData.topCustomers} isCurrency />
                    </div>
                 </ChartContainer>
            </div>

            <BreakdownModal 
                isOpen={!!selectedBreakdown}
                onClose={() => setSelectedBreakdown(null)}
                title={selectedBreakdown?.title || ''}
                data={selectedBreakdown ? getBreakdownData(selectedBreakdown.type) : []}
                onViewOrders={(category) => {
                    if (selectedBreakdown) {
                        onCardClick?.(selectedBreakdown.type, undefined, category);
                        setSelectedBreakdown(null);
                    }
                }}
            />

            {/* Operational Lists Removed as per request */}
        </div>
    );
};

export default Dashboard;
