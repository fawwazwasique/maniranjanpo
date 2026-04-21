
import React, { useMemo } from 'react';
import type { PurchaseOrder } from '../types';
import { OverallPOStatus, FulfillmentStatus, OrderStatus, POItemStatus, CustomerCategory } from '../types';
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, TruckIcon, UserGroupIcon, XMarkIcon, ChartPieIcon, CalendarDaysIcon, CurrencyRupeeIcon, NoSymbolIcon, ArrowUpIcon, ArrowDownIcon, SparklesIcon, BeakerIcon, ExclamationTriangleIcon, DocumentTextIcon, CheckBadgeIcon, ArrowRightCircleIcon, WrenchScrewdriverIcon, CubeIcon, ArchiveBoxXMarkIcon, ShieldExclamationIcon, ArrowPathIcon, PresentationChartLineIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE, ITEM_CATEGORIES, CUSTOMER_CATEGORIES, ZONES, SALE_TYPES } from '../constants';
import { getPOFulfillmentStatus, getPOValue } from '../utils/poUtils';
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
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dataLimit?: number;
  onLoadMore?: () => void;
  onLoadAll?: () => void;
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

const isOilItem = (item: any) => {
    const cat = (item.category || '').toLowerCase();
    const desc = (item.itemDesc || '').toLowerCase();
    const pn = (item.partNumber || '').toLowerCase();
    
    if (cat === 'oil') return true;
    if (cat === 'filter' || desc.includes('filter') || pn.includes('filter')) return false;
    if (['core', 'recon', 'battery', 'service', 'local parts', 'growth parts'].includes(cat)) return false;

    return (desc.includes('oil') || pn.includes('oil') || desc.includes('valvoline') || pn.includes('valvoline')) && 
           !desc.includes('filter') && !pn.includes('filter');
};

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


const ImpactCard: React.FC<{ 
    title: string; 
    subtitle?: string;
    icon: React.ReactNode; 
    colorClass: string; 
    bgClass: string;
    metrics: { label: string; value: string | number; isMain?: boolean; isCurrency?: boolean }[];
    onClick?: () => void;
}> = ({ title, subtitle, icon, colorClass, bgClass, metrics, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 ${colorClass} flex flex-col justify-between group cursor-pointer hover:scale-[1.01] transition-all`}
    >
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">{title}</p>
                {subtitle && <p className={`${colorClass.replace('border-', 'text-')} text-[10px] font-bold uppercase`}>{subtitle}</p>}
            </div>
            <div className={`${bgClass} p-2 rounded-lg`}>
                {icon}
            </div>
        </div>
        <div className="space-y-3">
            {metrics.map((m, i) => (
                <div key={m.label} className={`${m.isMain ? 'mb-2' : ''}`}>
                    <div className="flex justify-between items-baseline">
                        <span className={`text-[11px] font-bold uppercase ${m.isMain ? 'text-slate-400' : 'text-slate-500'}`}>{m.label}</span>
                        <span className={`${m.isMain ? 'text-2xl font-black' : 'text-sm font-bold'} text-slate-800 dark:text-white`}>
                            {m.isCurrency ? formatCurrency(Number(m.value) || 0, { notation: 'compact' }) : m.value}
                        </span>
                    </div>
                    {m.isMain && <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden"><div className={`h-full ${bgClass.replace('/10', '').replace('/30', '')}`} style={{ width: '100%' }}></div></div>}
                </div>
            ))}
        </div>
    </div>
);

const FulfillmentDetailCard: React.FC<{
    title: string;
    subtitle: string;
    pos: number;
    value: number;
    availValue?: number;
    gapValue?: number;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    icon: React.ReactNode;
    onClick: () => void;
    onViewBtnClick: () => void;
}> = ({ title, subtitle, pos, value, availValue, gapValue, colorClass, borderClass, bgClass, icon, onClick, onViewBtnClick }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-t-8 ${borderClass} overflow-hidden flex flex-col h-full`}>
        <div className="p-6 flex-1 cursor-pointer" onClick={onClick}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">{title}</h3>
                    <p className={`${colorClass} text-xs font-bold`}>{subtitle}</p>
                </div>
                <div className={`${bgClass} p-3 rounded-xl`}>{icon}</div>
            </div>
            
            <div className="mb-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-800 dark:text-white">{pos}</span>
                    <span className="text-slate-400 font-bold text-lg uppercase">POs</span>
                </div>
                <div className="text-2xl font-black mt-1" style={{ color: colorClass.includes('green') ? '#10b981' : colorClass.includes('orange') ? '#f59e0b' : '#ef4444' }}>
                   {formatCurrency(value)}
                </div>
            </div>

            {(availValue !== undefined || gapValue !== undefined) && (
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                        <span>Total Value</span>
                        <span className="text-slate-700 dark:text-slate-200">{formatCurrency(value, { notation: 'compact' })}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                        <div className="flex items-center gap-2">
                            <NoSymbolIcon className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Not Available</span>
                        </div>
                        <span className="text-xs font-bold text-red-600">{formatCurrency(gapValue || 0, { notation: 'compact' })}</span>
                    </div>
                </div>
            )}
        </div>
        <div className="px-6 pb-6 mt-auto">
            <button 
                onClick={(e) => { e.stopPropagation(); onViewBtnClick(); }}
                className={`w-full py-4 ${bgClass.replace('/10', '').replace('/30', '')} hover:opacity-90 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs`}
            >
                View {title.split(' ')[0]} POs
            </button>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ purchaseOrders, filters, setFilters, customers, onCardClick, onRefresh, isRefreshing, dataLimit, onLoadMore, onLoadAll }) => {
    const [selectedBreakdown, setSelectedBreakdown] = React.useState<{ type: string, title: string } | null>(null);
    
    const isDataLimited = useMemo(() => dataLimit && purchaseOrders.length >= dataLimit, [purchaseOrders, dataLimit]);

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
        const calculateValue = (pos: PurchaseOrder[]) => pos.reduce((acc, po) => acc + getPOValue(po), 0);

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
        const getAvailabilityPercent = (po: PurchaseOrder) => {
            const total = (po.items || []).length;
            if (total === 0) return 0;
            const availableCount = (po.items || []).filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
            return (availableCount / total) * 100;
        };

        const fullyAvailablePOsList = activePOs.filter(po => getPOFulfillmentStatus(po) === FulfillmentStatus.Available);
        const fullyAvailablePOs = fullyAvailablePOsList.length;
        const fullyAvailableValue = calculateValue(fullyAvailablePOsList);

        const getBucketData = (min: number, max: number, isExact: boolean = false) => {
            const list = activePOs.filter(po => {
                const p = getAvailabilityPercent(po);
                return isExact ? p === min : (p >= min && p < max);
            });
            let availVal = 0;
            let gapVal = 0;
            list.forEach(po => {
                (po.items || []).forEach(item => {
                    const val = (Number(item.quantity || 0) * Number(item.rate || 0));
                    if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                        availVal += val;
                    } else {
                        gapVal += val;
                    }
                });
            });
            return { count: list.length, totalValue: list.reduce((acc, p) => acc + getPOValue(p), 0), availVal, gapVal };
        };

        const b0 = getBucketData(0, 0, true);
        const b50 = getBucketData(50, 70);
        const b70 = getBucketData(70, 90);
        const b90 = getBucketData(90, 100);

        const avail0POs = b0.count;
        const avail0Value = b0.totalValue;
        const avail0AvailValue = b0.availVal;
        const avail0GapValue = b0.gapVal;

        const avail50POs = b50.count;
        const avail50Value = b50.totalValue;
        const avail50AvailValue = b50.availVal;
        const avail50GapValue = b50.gapVal;

        const avail70POs = b70.count;
        const avail70Value = b70.totalValue;
        const avail70AvailValue = b70.availVal;
        const avail70GapValue = b70.gapVal;
        
        const avail90POs = b90.count;
        const avail90Value = b90.totalValue;
        const avail90AvailValue = b90.availVal;
        const avail90GapValue = b90.gapVal;

        // 2. Partially Available
        const partiallyAvailablePOsList = activePOs.filter(po => getPOFulfillmentStatus(po) === FulfillmentStatus.PartiallyAvailable);
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
                } else if (item.status === POItemStatus.NotAvailable) {
                    partialNotAvailableItemsValue += itemValue;
                }
            });
        });

        // 3. 100% Not Available
        const notAvailablePOsList = activePOs.filter(po => (po.items || []).every(item => item.status === POItemStatus.NotAvailable || item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) && (po.items || []).some(item => item.status === POItemStatus.NotAvailable));
        // Actually, let's keep the easier filter and just update how the VALUE is calculated for NOT AVAILABLE
        const notAvailablePOs = notAvailablePOsList.length;
        
        let notAvailableValue = 0;
        notAvailablePOsList.forEach(po => {
           (po.items || []).forEach(item => {
               if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                   notAvailableValue += (Number(item.quantity || 0) * Number(item.rate || 0));
               }
           });
        });

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
        const fullyTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p) === FulfillmentStatus.Available, p => p.length, true);
        const partialTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p) === FulfillmentStatus.PartiallyAvailable, p => p.length, true);
        const notAvailableTrend = getTrend(purchaseOrders, filters, p => p.orderStatus !== OrderStatus.Invoiced && getPOFulfillmentStatus(p) === FulfillmentStatus.NotAvailable, p => p.length, false);
        const invoicedTrend = getTrend(purchaseOrders, filters, p => p.orderStatus === OrderStatus.Invoiced, p => p.length, true);

        // Advanced Blocking Analysis
        let totalOilRequiredValue = 0;
        let totalPartsRequiredValue = 0;

        const oilOnlyBlockedPOs: PurchaseOrder[] = [];
        const partsOnlyBlockedPOs: PurchaseOrder[] = [];
        const bothBlockedPOs: PurchaseOrder[] = [];

        activePOs.forEach(po => {
            const items = po.items || [];
            if (items.length === 0) return;

            const oilItems = items.filter(isOilItem);
            const otherItems = items.filter(i => !isOilItem(i));

            const oilMissing = oilItems.some(i => i.status === POItemStatus.NotAvailable);
            const partsMissing = otherItems.some(i => i.status === POItemStatus.NotAvailable);

            // Calculate overall requirement values
            items.forEach(item => {
                const itemValue = (Number(item.quantity || 0) * Number(item.rate || 0));
                if (item.status === POItemStatus.NotAvailable) {
                    if (isOilItem(item)) {
                        totalOilRequiredValue += itemValue;
                    } else {
                        totalPartsRequiredValue += itemValue;
                    }
                }
            });

            // Categorize POs by blocking constraint
            if (oilMissing && !partsMissing) {
                oilOnlyBlockedPOs.push(po);
            } else if (!oilMissing && partsMissing) {
                partsOnlyBlockedPOs.push(po);
            } else if (oilMissing && partsMissing) {
                bothBlockedPOs.push(po);
            }
        });

        const getBlockedMetrics = (pos: PurchaseOrder[], constraint: 'oil' | 'parts') => {
            let count = pos.length;
            let totalPOValue = 0;
            let constraintNotAvailableValue = 0;

            pos.forEach(po => {
                totalPOValue += getPOValue(po);
                (po.items || []).forEach(item => {
                    if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                        const itemValue = (Number(item.quantity || 0) * Number(item.rate || 0));
                        if (constraint === 'oil' && isOilItem(item)) {
                            constraintNotAvailableValue += itemValue;
                        } else if (constraint === 'parts' && !isOilItem(item)) {
                            constraintNotAvailableValue += itemValue;
                        }
                    }
                });
            });
            return { count, totalValue: totalPOValue, constraintNotAvailableValue };
        };

        const oilOnlyMetrics = getBlockedMetrics(oilOnlyBlockedPOs, 'oil');
        const partsOnlyMetrics = getBlockedMetrics(partsOnlyBlockedPOs, 'parts');

        // Revenue Opportunity if constraints are resolved
        const potentialRevenueIfOilResolved = oilOnlyMetrics.totalValue;
        const potentialRevenueIfPartsResolved = partsOnlyMetrics.totalValue;
        const bothBlockedMetrics = getBlockedMetrics(bothBlockedPOs, 'oil'); // Just use 'oil' as a fallback, or handle differently.
        // Actually, for bothBlockedPOs, it's not clear which metrics to show for Not Available value.
        // Let's just calculate potential revenue using the total value.
        const potentialRevenueIfBothResolved = bothBlockedPOs.reduce((acc, po) => acc + getPOValue(po), 0);

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

        const checklistDataRaw: Record<string, number> = {
            'B-Check': activePOs.filter(po => po.checklist?.bCheck).length,
            'C-Check': activePOs.filter(po => po.checklist?.cCheck).length,
            'D-Check': activePOs.filter(po => po.checklist?.dCheck).length,
            'Battery': activePOs.filter(po => po.checklist?.battery).length,
            'Spares': activePOs.filter(po => po.checklist?.spares).length,
            'BD': activePOs.filter(po => po.checklist?.bd).length,
            'Radiator': activePOs.filter(po => po.checklist?.radiatorDescaling).length,
            'Others': activePOs.filter(po => po.checklist?.others).length,
        };
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
            const status = getPOFulfillmentStatus(po);
            const value = getPOValue(po);
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
            avail0POs, avail0Value, avail0AvailValue, avail0GapValue,
            avail50POs, avail50Value, avail50AvailValue, avail50GapValue,
            avail70POs, avail70Value, avail70AvailValue, avail70GapValue,
            avail90POs, avail90Value, avail90AvailValue, avail90GapValue,
            unavailablePartsList,
            checklistChartData, fulfillmentChartData, topCustomers, paymentTermsChartData, salesTypeCountChartData,
            readyToExecuteChartData, customerCategoryChartData,
            poAgeingChartData, poAgeingValueChartData, branchPerformanceChartData,
            avgPOtoSO, avgSOtoInvoice, avgPOtoInvoice,
            openTrend, valueTrend, fullyTrend, partialTrend, notAvailableTrend,
            avgPOtoSOTrend, avgSOtoInvoiceTrend, avgPOtoInvoiceTrend,
            totalInvoicedPOs, totalInvoicedValue, invoicedTrend,
            partialInvoicedPOs, partialInvoicedValue,
            top50TotalValue, top50Contribution,
            totalOilRequiredValue,
            totalPartsRequiredValue,
            oilOnlyMetrics,
            partsOnlyMetrics,
            bothBlockedMetrics,
            potentialRevenueIfOilResolved,
            potentialRevenueIfPartsResolved,
            potentialRevenueIfBothResolved
        };
    }, [activePOs, invoicedPOs, purchaseOrders, filters]);

    const getBreakdownData = (type: string) => {
        let pos: PurchaseOrder[] = [];
        let isGap = false;

        if (type === 'OPEN') pos = activePOs;
        else if (type === 'FULLY_AVAILABLE') pos = activePOs.filter(po => getPOFulfillmentStatus(po) === FulfillmentStatus.Available);
        else if (type === 'PARTIALLY_AVAILABLE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po) === FulfillmentStatus.PartiallyAvailable);
            isGap = true;
        }
        else if (type === 'NOT_AVAILABLE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po) === FulfillmentStatus.NotAvailable);
            isGap = true;
        }
        else if (type === 'ANY_SHORTAGE') {
            pos = activePOs.filter(po => getPOFulfillmentStatus(po) !== FulfillmentStatus.Available);
            isGap = true;
        }
        else if (type === 'INVOICED') pos = invoicedPOs;
        else if (type === 'PARTIAL_INVOICED') pos = filteredPOs.filter(po => po.orderStatus === OrderStatus.PartiallyInvoiced);
        else if (type === 'OIL_ONLY_BLOCKED') {
            isGap = true;
            pos = activePOs.filter(po => {
                const items = po.items || [];
                const oilMissing = items.filter(isOilItem).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                const partsMissing = items.filter(i => !isOilItem(i)).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                return oilMissing && !partsMissing;
            });
        }
        else if (type === 'PARTS_ONLY_BLOCKED') {
            isGap = true;
            pos = activePOs.filter(po => {
                const items = po.items || [];
                const oilMissing = items.filter(isOilItem).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                const partsMissing = items.filter(i => !isOilItem(i)).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                return !oilMissing && partsMissing;
            });
        }
        else if (type === 'BOTH_BLOCKED') {
            isGap = true;
            pos = activePOs.filter(po => {
                const items = po.items || [];
                const oilMissing = items.filter(isOilItem).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                const partsMissing = items.filter(i => !isOilItem(i)).some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
                return oilMissing && partsMissing;
            });
        }
        else if (type === 'GAP') {
            pos = activePOs;
            isGap = true;
        }

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        const categoryTotals: Record<string, number> = {};

        if (type.startsWith('AVAILABILITY_')) {
            const bucketThreshold = parseInt(type.split('_')[1]);
            pos = activePOs.filter(po => {
                const total = (po.items || []).length;
                if (total === 0) return false;
                const availableCount = (po.items || []).filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
                const percent = (availableCount / total) * 100;
                
                if (bucketThreshold === 0) return percent === 0;
                if (bucketThreshold === 50) return percent >= 50 && percent < 70;
                if (bucketThreshold === 70) return percent >= 70 && percent < 90;
                if (bucketThreshold === 90) return percent >= 90 && percent < 100;
                return false;
            });
            
            const categoryBreakdown: Record<string, { available: number, pending: number }> = {};
            pos.forEach(po => {
                (po.items || []).forEach(item => {
                    const cat = item.category || 'Uncategorized';
                    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { available: 0, pending: 0 };
                    
                    if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                        categoryBreakdown[cat].available += 1;
                    } else {
                        categoryBreakdown[cat].pending += 1;
                    }
                });
            });

            return Object.entries(categoryBreakdown).map(([label, data]) => ({
                label: `${label} (Avail: ${data.available} | Pending: ${data.pending})`,
                value: data.available + data.pending,
                color: data.pending > 0 ? '#ef4444' : '#10b981'
            }));
        }

        pos.forEach(po => {
            (po.items || []).forEach(item => {
                // If analyzing oil blocked, we want to know what can be billed if oil arrives
                // thus we exclude already dispatched items from the breakdown
                if (type === 'OIL_BLOCKED' && item.status === POItemStatus.Dispatched) return;

                let label = normalizeToAllowedValue(item.category, ITEM_CATEGORIES) || 'Others';
                
                // Ensure Valvoline items are correctly grouped as "Oil" in the breakdown
                if (type === 'OIL_BLOCKED') {
                    const isOil = item.category === 'Oil' || 
                                 (item.partNumber && (item.partNumber.toLowerCase().includes('oil') || item.partNumber.toLowerCase().includes('valvoline'))) ||
                                 (item.itemDesc && (item.itemDesc.toLowerCase().includes('oil') || item.itemDesc.toLowerCase().includes('valvoline')));
                    if (isOil) label = 'Oil';
                }

                if (filters.categories.length > 0 && !filters.categories.includes(label)) return;
                
                const val = (Number(item.quantity || 0) * Number(item.rate || 0));
                
                if (isGap) {
                    if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                        categoryTotals[label] = (categoryTotals[label] || 0) + val;
                    }
                } else {
                    categoryTotals[label] = (categoryTotals[label] || 0) + val;
                }
            });
        });
        
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <ChartPieIcon className="w-10 h-10 text-red-600" />
                        Supply Chain & Fulfillment Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Real-time supply chain visibility & order tracking</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                        {onRefresh && (
                            <button 
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50 active:scale-95"
                            >
                                <ClockIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold border border-red-100 dark:border-red-900/30">
                            <CalendarDaysIcon className="w-5 h-5" />
                            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    {isDataLimited && (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30 shadow-sm">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            <span>Showing latest {purchaseOrders.length} orders. Dashboard metrics may be partial.</span>
                            <div className="flex items-center gap-2 ml-2">
                                {onLoadMore && (
                                    <button onClick={onLoadMore} className="underline hover:text-amber-700 dark:hover:text-amber-300">
                                        Load More
                                    </button>
                                )}
                                {onLoadAll && (
                                    <>
                                        <span className="text-amber-300">|</span>
                                        <button onClick={onLoadAll} className="underline hover:text-amber-700 dark:hover:text-amber-300">
                                            Load All
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
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

            {/* 1. Top Section (Executive Summary – Big Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <DashboardStatCard 
                    title="Total PO Count" 
                    value={dashboardData.totalOpenPOs} 
                    icon={<ClockIcon className="w-6 h-6 text-amber-500" />} 
                    indicatorColor="bg-amber-500"
                    trend={dashboardData.openTrend}
                    onClick={() => setSelectedBreakdown({ type: 'OPEN', title: "Total PO Count" })}
                />
                <DashboardStatCard 
                    title="Total PO Value" 
                    value={formatCurrency(dashboardData.openPOValue, { notation: 'compact' })} 
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-primary" />} 
                    indicatorColor="bg-primary"
                    trend={dashboardData.valueTrend}
                    onClick={() => setSelectedBreakdown({ type: 'OPEN', title: "Total PO Value" })}
                />
                <DashboardStatCard 
                    title="Available PO Count" 
                    value={dashboardData.fullyAvailablePOs} 
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} 
                    indicatorColor="bg-green-500"
                    trend={dashboardData.fullyTrend}
                    onClick={() => setSelectedBreakdown({ type: 'FULLY_AVAILABLE', title: "Available PO Count" })}
                />
                <DashboardStatCard 
                    title="Available PO Value" 
                    value={formatCurrency(dashboardData.fullyAvailableValue, { notation: 'compact' })} 
                    icon={<SparklesIcon className="w-6 h-6 text-emerald-500" />} 
                    indicatorColor="bg-emerald-500"
                    onClick={() => setSelectedBreakdown({ type: 'FULLY_AVAILABLE', title: "Available PO Value" })}
                />
            </div>

            {/* 2. Second Row (Category Overview Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <FulfillmentDetailCard 
                    title="READY TO EXECUTE"
                    subtitle="100% Items Available"
                    pos={dashboardData.fullyAvailablePOs}
                    value={dashboardData.fullyAvailableValue}
                    colorClass="text-green-600"
                    borderClass="border-green-500"
                    bgClass="bg-green-100 dark:bg-green-900/30"
                    icon={<CheckCircleIcon className="w-8 h-8 text-green-600" />}
                    onClick={() => setSelectedBreakdown({ type: 'FULLY_AVAILABLE', title: "Ready to Execute" })}
                    onViewBtnClick={() => onCardClick?.('FULLY_AVAILABLE')}
                />
                <FulfillmentDetailCard 
                    title="PARTIALLY AVAILABLE"
                    subtitle="Some Items Missing"
                    pos={dashboardData.partiallyAvailablePOs}
                    value={dashboardData.partiallyAvailableValue}
                    gapValue={dashboardData.partialNotAvailableItemsValue}
                    colorClass="text-blue-500"
                    borderClass="border-blue-500"
                    bgClass="bg-blue-100 dark:bg-blue-900/30"
                    icon={<TruckIcon className="w-8 h-8 text-blue-500" />}
                    onClick={() => setSelectedBreakdown({ type: 'PARTIALLY_AVAILABLE', title: "Partially Available" })}
                    onViewBtnClick={() => onCardClick?.('PARTIALLY_AVAILABLE')}
                />
                <FulfillmentDetailCard 
                    title="100% NOT AVAILABLE"
                    subtitle="No Items in Stock"
                    pos={dashboardData.notAvailablePOs}
                    value={dashboardData.notAvailableValue}
                    gapValue={dashboardData.notAvailableValue}
                    colorClass="text-red-500"
                    borderClass="border-red-500"
                    bgClass="bg-red-100 dark:bg-red-900/30"
                    icon={<NoSymbolIcon className="w-8 h-8 text-red-500" />}
                    onClick={() => setSelectedBreakdown({ type: 'NOT_AVAILABLE', title: "100% Not Available" })}
                    onViewBtnClick={() => onCardClick?.('NOT_AVAILABLE')}
                />
            </div>

            {/* 3. Third Row (Billing Status) */}
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <DocumentTextIcon className="w-6 h-6 text-primary" />
                Billing Success Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div 
                    onClick={() => setSelectedBreakdown({ type: 'INVOICED', title: "Full Invoices" })}
                    className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border-b-4 border-slate-400 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                >
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl">
                            <CheckBadgeIcon className="w-10 h-10 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest mb-1">Total Full Invoices</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white">{formatCurrency(dashboardData.totalInvoicedValue)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-slate-500">{dashboardData.totalInvoicedPOs} POs</p>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">Confirmed Billing</p>
                    </div>
                </div>

                <div 
                    onClick={() => setSelectedBreakdown({ type: 'PARTIAL_INVOICED', title: "Partial Invoices" })}
                    className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border-b-4 border-purple-400 flex items-center justify-between group cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all"
                >
                    <div className="flex items-center gap-6">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl">
                            <SparklesIcon className="w-10 h-10 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-slate-400 font-black text-sm uppercase tracking-widest mb-1">Total Partial Invoices</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white">{formatCurrency(dashboardData.partialInvoicedValue)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-purple-500">{dashboardData.partialInvoicedPOs} POs</p>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">In-Progress Billing</p>
                    </div>
                </div>
            </div>

            {/* 4. Fourth Row (Oil Dependency Analysis) */}
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <BeakerIcon className="w-6 h-6 text-orange-500" />
                Oil Dependency Analysis (Valvoline)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
                <ImpactCard 
                    title="1. Stuck due to Oil Only"
                    subtitle="All parts available, only oil missing"
                    icon={<BeakerIcon className="w-6 h-6 text-amber-600" />}
                    colorClass="border-amber-500"
                    bgClass="bg-amber-100 dark:bg-amber-900/30"
                    onClick={() => setSelectedBreakdown({ type: 'OIL_ONLY_BLOCKED', title: "Stuck by Oil Only" })}
                    metrics={[
                        { label: "Number of Stuck POs", value: `${dashboardData.oilOnlyMetrics.count} POs`, isMain: true },
                        { label: "Stuck PO Total Value", value: dashboardData.oilOnlyMetrics.totalValue, isCurrency: true },
                        { label: "Oil Not Available Value", value: dashboardData.oilOnlyMetrics.constraintNotAvailableValue, isCurrency: true }
                    ]}
                />
                <ImpactCard 
                    title="2. Closure Value (If Oil Provided)"
                    subtitle="Total billing value unlocked by oil"
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-green-600" />}
                    colorClass="border-green-500"
                    bgClass="bg-green-100 dark:bg-green-900/30"
                    metrics={[
                        { label: "Total Billable Amount", value: dashboardData.potentialRevenueIfOilResolved, isMain: true, isCurrency: true }
                    ]}
                />
            </div>

            {/* 5. Fifth Row (Parts Unavailability Analysis) */}
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <CubeIcon className="w-6 h-6 text-blue-500" />
                Parts Dependency Analysis (CIL)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
                <ImpactCard 
                    title="1. Stuck due to Parts Only"
                    subtitle="Oil is available, only parts missing"
                    icon={<ArchiveBoxXMarkIcon className="w-6 h-6 text-pink-600" />}
                    colorClass="border-pink-500"
                    bgClass="bg-pink-100 dark:bg-pink-900/30"
                    onClick={() => setSelectedBreakdown({ type: 'PARTS_ONLY_BLOCKED', title: "Stuck by Parts Only" })}
                    metrics={[
                        { label: "Number of Stuck POs", value: `${dashboardData.partsOnlyMetrics.count} POs`, isMain: true },
                        { label: "Stuck PO Total Value", value: dashboardData.partsOnlyMetrics.totalValue, isCurrency: true },
                        { label: "Parts Not Available Value", value: dashboardData.partsOnlyMetrics.constraintNotAvailableValue, isCurrency: true }
                    ]}
                />
                <ImpactCard 
                    title="2. Closure Value (If Parts Provided)"
                    subtitle="Total billing value unlocked by parts"
                    icon={<ArrowRightCircleIcon className="w-6 h-6 text-blue-600" />}
                    colorClass="border-blue-500"
                    bgClass="bg-blue-100 dark:bg-blue-900/30"
                    metrics={[
                        { label: "Total Billable Amount", value: dashboardData.potentialRevenueIfPartsResolved, isMain: true, isCurrency: true }
                    ]}
                />
            </div>

            {/* Availability Buckets */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 w-full mb-6">
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <ChartPieIcon className="w-6 h-6 text-primary" />
                    Availability Performance Buckets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardStatCard 
                        title="0% Available" 
                        value={dashboardData.avail0POs} 
                        subValue={`Avail: ₹0 | Gap: ${formatCurrency(dashboardData.avail0GapValue, { notation: 'compact' })} | Total: ${formatCurrency(dashboardData.avail0Value, { notation: 'compact' })}`} 
                        icon={<NoSymbolIcon className="w-6 h-6 text-red-600"/>} 
                        onClick={() => setSelectedBreakdown({ type: 'AVAILABILITY_0', title: "0% Availability Analysis" })} 
                        indicatorColor="bg-red-600"
                    />
                    <DashboardStatCard 
                        title="50%+ Available" 
                        value={dashboardData.avail50POs} 
                        subValue={`Avail: ${formatCurrency(dashboardData.avail50AvailValue, { notation: 'compact' })} | Gap: ${formatCurrency(dashboardData.avail50GapValue, { notation: 'compact' })} | Total: ${formatCurrency(dashboardData.avail50Value, { notation: 'compact' })}`} 
                        icon={<TruckIcon className="w-6 h-6 text-orange-500"/>} 
                        onClick={() => setSelectedBreakdown({ type: 'AVAILABILITY_50', title: "50%+ Availability Analysis" })} 
                        indicatorColor="bg-orange-500"
                    />
                    <DashboardStatCard 
                        title="70%+ Available" 
                        value={dashboardData.avail70POs} 
                        subValue={`Avail: ${formatCurrency(dashboardData.avail70AvailValue, { notation: 'compact' })} | Gap: ${formatCurrency(dashboardData.avail70GapValue, { notation: 'compact' })} | Total: ${formatCurrency(dashboardData.avail70Value, { notation: 'compact' })}`} 
                        icon={<ClockIcon className="w-6 h-6 text-yellow-500"/>} 
                        onClick={() => setSelectedBreakdown({ type: 'AVAILABILITY_70', title: "70%+ Availability Analysis" })} 
                        indicatorColor="bg-yellow-500"
                    />
                    <DashboardStatCard 
                        title="90%+ Available" 
                        value={dashboardData.avail90POs} 
                        subValue={`Avail: ${formatCurrency(dashboardData.avail90AvailValue, { notation: 'compact' })} | Gap: ${formatCurrency(dashboardData.avail90GapValue, { notation: 'compact' })} | Total: ${formatCurrency(dashboardData.avail90Value, { notation: 'compact' })}`} 
                        icon={<CheckCircleIcon className="w-6 h-6 text-green-500"/>} 
                        onClick={() => setSelectedBreakdown({ type: 'AVAILABILITY_90', title: "90%+ Availability Analysis" })} 
                        indicatorColor="bg-green-500"
                    />
                </div>
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
