
import React, { useMemo } from 'react';
import type { PurchaseOrder } from '../types';
import { OverallPOStatus, FulfillmentStatus, OrderStatus, POItemStatus } from '../types';
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, TruckIcon, UserGroupIcon, XMarkIcon, ChartPieIcon, CalendarDaysIcon, CurrencyRupeeIcon, NoSymbolIcon, ArrowUpIcon, ArrowDownIcon, SparklesIcon, BeakerIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE, ITEM_CATEGORIES } from '../constants';
import { isOilItem, isOilStuckPO } from '../utils/poUtils';

interface DashboardProps {
  purchaseOrders: PurchaseOrder[];
  filters: {
    status: string;
    customer: string;
    date: string;
    mainBranch: string;
    subBranch: string;
    categories: string[];
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string;
    customer: string;
    date: string;
    mainBranch: string;
    subBranch: string;
    categories: string[];
  }>>;
  customers: string[];
  onCardClick?: (type: string) => void;
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
        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
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
            <ChartPieIcon className="w-5 h-5 text-red-500" /> {title}
        </h3>
        {children}
    </div>
);


const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
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
                        {data.reduce((acc, segment) => {
                             const segmentLength = (segment.value / total) * circumference;
                             
                             acc.elements.push(
                                <circle
                                    key={segment.label}
                                    cx="50" cy="50" r={radius}
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="15"
                                    strokeDasharray={`${segmentLength} ${circumference}`}
                                    strokeDashoffset={-acc.accumulatedLength}
                                />
                             );
                             acc.accumulatedLength += segmentLength;
                             return acc;
                        }, { accumulatedLength: 0, elements: [] as React.ReactNode[] }).elements}
                    </g>
                     <text x="50" y="50" textAnchor="middle" dy=".3em" className="text-lg font-bold fill-current text-slate-800 dark:text-slate-100">
                       {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })}
                    </text>
                </svg>
            </div>
            <div className="space-y-2">
                {data.filter(d => d.value > 0).map(segment => (
                    <div key={segment.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: segment.color }}></span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{segment.label}</span>
                        <span className="ml-auto font-bold text-slate-700 dark:text-slate-200">
                            {segment.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })}
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
        ? val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })
        : val.toLocaleString();
        
    return (
        <div className="space-y-4 pr-4">
            {data.map(item => (
                <div key={item.label} className="space-y-1.5">
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


const getPOFulfillmentStatus = (po: PurchaseOrder, selectedCategories: string[]) => {
    const relevantItems = (po.items || []).filter(item => 
        selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );
    
    if (relevantItems.length === 0) return FulfillmentStatus.NotAvailable;

    const fullyAvailableCount = relevantItems.filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
    const notAvailableCount = relevantItems.filter(i => i.status === POItemStatus.NotAvailable).length;
    
    if (fullyAvailableCount === relevantItems.length) return FulfillmentStatus.Available;
    if (notAvailableCount === relevantItems.length) return FulfillmentStatus.NotAvailable;
    return FulfillmentStatus.PartiallyAvailable;
};

const getPOValue = (po: PurchaseOrder, selectedCategories: string[]) => {
    const relevantItems = (po.items || []).filter(item => 
        selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );
    return relevantItems.reduce((itemAcc, item) => itemAcc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
};

const Dashboard: React.FC<DashboardProps> = ({ purchaseOrders, filters, setFilters, customers, onCardClick }) => {
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'mainBranch') {
            setFilters(prev => ({ ...prev, mainBranch: value, subBranch: '' }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const toggleCategory = (category: string) => {
        setFilters(prev => {
            const current = prev.categories || [];
            const next = current.includes(category)
                ? current.filter(c => c !== category)
                : [...current, category];
            return { ...prev, categories: next };
        });
    };

    const filteredPOs = useMemo(() => {
        return purchaseOrders
            .filter(po => filters.status ? po.status === filters.status : true)
            .filter(po => filters.customer ? (po.customerName || '').toLowerCase().includes(filters.customer.toLowerCase()) : true)
            .filter(po => filters.date ? new Date(po.poDate).toISOString().split('T')[0] === filters.date : true)
            .filter(po => filters.mainBranch ? po.mainBranch === filters.mainBranch : true)
            .filter(po => filters.subBranch ? po.subBranch === filters.subBranch : true)
            .filter(po => {
                if (!filters.categories || filters.categories.length === 0) return true;
                return (po.items || []).some(item => filters.categories.includes(item.category));
            });
    }, [purchaseOrders, filters]);

    const getTrend = (
        allPOs: PurchaseOrder[], 
        currentFilters: typeof filters, 
        filterFn: (po: PurchaseOrder) => boolean,
        valueFn: (pos: PurchaseOrder[]) => number,
        isPositiveGood: boolean = true
    ): TrendData | null => {
        const contextPOs = allPOs.filter(po => {
            if (currentFilters.customer && !(po.customerName || '').toLowerCase().includes(currentFilters.customer.toLowerCase())) return false;
            if (currentFilters.mainBranch && po.mainBranch !== currentFilters.mainBranch) return false;
            if (currentFilters.subBranch && po.subBranch !== currentFilters.subBranch) return false;
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

        const openPOs = filteredPOs;
        const totalOpenPOs = openPOs.length;
        const openPOValue = calculateValue(openPOs);
        
        // 1. 100% Available (Ready to Execute)
        const fullyAvailablePOsList = filteredPOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.Available);
        const fullyAvailablePOs = fullyAvailablePOsList.length;
        const fullyAvailableValue = calculateValue(fullyAvailablePOsList);

        // 2. Partially Available
        const partiallyAvailablePOsList = filteredPOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.PartiallyAvailable);
        const partiallyAvailablePOs = partiallyAvailablePOsList.length;
        const partiallyAvailableValue = calculateValue(partiallyAvailablePOsList);
        
        // Bifurcation for partially available
        let partialAvailableItemsCount = 0;
        let partialAvailableItemsValue = 0;
        let partialNotAvailableItemsCount = 0;
        let partialNotAvailableItemsValue = 0;
        partiallyAvailablePOsList.forEach(po => {
            po.items.forEach(item => {
                const itemValue = (Number(item.quantity || 0) * Number(item.rate || 0));
                if (item.status === POItemStatus.Available || item.status === POItemStatus.Dispatched) {
                    partialAvailableItemsCount++;
                    partialAvailableItemsValue += itemValue;
                } else if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                    partialNotAvailableItemsCount++;
                    partialNotAvailableItemsValue += itemValue;
                }
            });
        });

        // 3. 100% Not Available
        const notAvailablePOsList = filteredPOs.filter(po => getPOFulfillmentStatus(po, filters.categories) === FulfillmentStatus.NotAvailable);
        const notAvailablePOs = notAvailablePOsList.length;
        const notAvailableValue = calculateValue(notAvailablePOsList);

        // 4. Global Part Shortage (Total items not available across all POs)
        let totalPartsNotAvailable = 0;
        filteredPOs.forEach(po => {
            po.items.forEach(item => {
                if (item.status === POItemStatus.NotAvailable || item.status === POItemStatus.PartiallyAvailable) {
                    totalPartsNotAvailable++;
                }
            });
        });

        // 5. Oil-Stuck POs (All parts available except Oil/Valvoline)
        const oilStuckPOsList = filteredPOs.filter(isOilStuckPO);
        const oilStuckPOs = oilStuckPOsList.length;
        const oilStuckValue = calculateValue(oilStuckPOsList);

        // 6. Aggregated Unavailable Parts List
        const unavailablePartsMap: Record<string, { partNumber: string, description: string, quantity: number, value: number, poCount: number }> = {};
        filteredPOs.forEach(po => {
            po.items.forEach(item => {
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
        const openTrend = getTrend(purchaseOrders, filters, p => true, p => p.length, true);
        const valueTrend = getTrend(purchaseOrders, filters, p => true, p => calculateValue(p), true);
        const fullyTrend = getTrend(purchaseOrders, filters, p => getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.Available, p => p.length, true);
        const partialTrend = getTrend(purchaseOrders, filters, p => getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.PartiallyAvailable, p => p.length, true);
        const notAvailableTrend = getTrend(purchaseOrders, filters, p => getPOFulfillmentStatus(p, filters.categories) === FulfillmentStatus.NotAvailable, p => p.length, false);

        const checklistDataRaw = {
            'B-Check': filteredPOs.filter(po => po.checklist?.bCheck).length,
            'C-Check': filteredPOs.filter(po => po.checklist?.cCheck).length,
            'D-Check': filteredPOs.filter(po => po.checklist?.dCheck).length,
            'Battery': filteredPOs.filter(po => po.checklist?.battery).length,
            'Spares': filteredPOs.filter(po => po.checklist?.spares).length,
            'BD': filteredPOs.filter(po => po.checklist?.bd).length,
            'Radiator': filteredPOs.filter(po => po.checklist?.radiatorDescaling).length,
            'Others': filteredPOs.filter(po => po.checklist?.others).length,
        };
        const checklistColors = { 
            'B-Check': '#34d399', 
            'C-Check': '#f59e0b', 
            'D-Check': '#ef4444', 
            'Battery': '#6366f1',
            'Spares': '#8b5cf6',
            'BD': '#ec4899',
            'Radiator': '#14b8a6',
            'Others': '#9ca3af' 
        };
        const checklistChartData = Object.entries(checklistDataRaw).map(([label, value]) => ({ label, value, color: checklistColors[label as keyof typeof checklistColors] || '#9ca3af' }));

        const valueByFulfillment = filteredPOs.reduce((acc, po) => {
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

        const customerValue = filteredPOs.reduce((acc, po) => {
            const value = getPOValue(po, filters.categories);
            acc[po.customerName] = (acc[po.customerName] || 0) + value;
            return acc;
        }, {} as { [key: string]: number });
        const topCustomers = Object.entries(customerValue).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value)).slice(0, 5);

        const valueByPayment = filteredPOs.reduce((acc, po) => {
            const type = po.saleType || 'N/A';
            const value = getPOValue(po, filters.categories);
            acc[type] = (acc[type] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const paymentColors = { 'Credit': '#3b82f6', 'Cash': '#22c55e' };
        const paymentTermsChartData = Object.entries(valueByPayment).map(([label, value]) => ({ label, value, color: paymentColors[label as keyof typeof paymentColors] || '#9ca3af'}));

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

        const valueByBranch = filteredPOs.reduce((acc, po) => {
            const branch = po.mainBranch || 'Unassigned';
            const value = getPOValue(po, filters.categories);
            acc[branch] = (acc[branch] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const branchPerformanceChartData = Object.entries(valueByBranch).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value));

        const avgPOtoSOVal = getAvgDays(filteredPOs, 'poDate', 'soDate');
        const avgSOtoInvoiceVal = getAvgDays(filteredPOs, 'soDate', 'invoiceDate');
        const avgPOtoInvoiceVal = getAvgDays(filteredPOs, 'poDate', 'invoiceDate');

        const avgPOtoSO = avgPOtoSOVal ? `${Math.round(avgPOtoSOVal)} days` : '0 days';
        const avgSOtoInvoice = avgSOtoInvoiceVal ? `${Math.round(avgSOtoInvoiceVal)} days` : '0 days';
        const avgPOtoInvoice = avgPOtoInvoiceVal ? `${Math.round(avgPOtoInvoiceVal)} days` : '0 days';

        const avgPOtoSOTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'poDate', 'soDate'), false);
        const avgSOtoInvoiceTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'soDate', 'invoiceDate'), false);
        const avgPOtoInvoiceTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'poDate', 'invoiceDate'), false);

        const totalNotAvailableValue = partialNotAvailableItemsValue + notAvailableValue;

        return { 
            totalOpenPOs, openPOValue: isNaN(openPOValue) ? 0 : openPOValue, 
            fullyAvailablePOs, fullyAvailableValue: isNaN(fullyAvailableValue) ? 0 : fullyAvailableValue, 
            partiallyAvailablePOs, partiallyAvailableValue: isNaN(partiallyAvailableValue) ? 0 : partiallyAvailableValue, 
            partialAvailableItemsCount, partialAvailableItemsValue,
            partialNotAvailableItemsCount, partialNotAvailableItemsValue,
            notAvailablePOs, notAvailableValue: isNaN(notAvailableValue) ? 0 : notAvailableValue,
            totalNotAvailableValue,
            totalPartsNotAvailable,
            oilStuckPOs, oilStuckValue: isNaN(oilStuckValue) ? 0 : oilStuckValue,
            oilStuckPOsList,
            unavailablePartsList,
            checklistChartData, fulfillmentChartData, topCustomers, paymentTermsChartData, 
            poAgeingChartData, poAgeingValueChartData, branchPerformanceChartData, 
            avgPOtoSO, avgSOtoInvoice, avgPOtoInvoice,
            openTrend, valueTrend, fullyTrend, partialTrend, notAvailableTrend,
            avgPOtoSOTrend, avgSOtoInvoiceTrend, avgPOtoInvoiceTrend
        };
    }, [filteredPOs, purchaseOrders, filters]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                     <div>
                        <label htmlFor="customer" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
                        <input type="text" id="customer" name="customer" value={filters.customer || ''} onChange={handleFilterChange} list="customer-list" placeholder="All" className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                         <datalist id="customer-list">
                            {customers.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label htmlFor="mainBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Main Branch</label>
                        <select id="mainBranch" name="mainBranch" value={filters.mainBranch || ''} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                            <option value="">All</option>
                            {MAIN_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Branch</label>
                        <select id="subBranch" name="subBranch" value={filters.subBranch || ''} onChange={handleFilterChange} disabled={!filters.mainBranch} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:opacity-50">
                            <option value="">All</option>
                            {filters.mainBranch && BRANCH_STRUCTURE[filters.mainBranch]?.map(sb => <option key={sb} value={sb}>{sb}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select id="status" name="status" value={filters.status || ''} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                            <option value="">All</option>
                            {Object.values(OverallPOStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">PO Date</label>
                        <input type="date" id="date" name="date" value={filters.date || ''} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter by Categories</label>
                        <div className="flex flex-wrap gap-1.5 p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/30 min-h-[46px]">
                            {ITEM_CATEGORIES.map(cat => {
                                const isSelected = filters.categories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 border ${
                                            isSelected
                                                ? 'bg-red-500 text-white border-red-500 shadow-sm scale-105'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                            {filters.categories.length > 0 && (
                                <button 
                                    onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                                    className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                     <div className="flex items-end">
                        <button onClick={() => setFilters({status: '', customer: '', date: '', mainBranch: '', subBranch: '', categories: []})} className="w-full justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center gap-2">
                           <XMarkIcon className="w-4 h-4" />
                           Clear All
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                <DashboardStatCard 
                    title="Total Active POs" 
                    value={dashboardData.totalOpenPOs} 
                    icon={<ClockIcon className="w-6 h-6 text-amber-500" />} 
                    indicatorColor="bg-amber-500"
                    trend={dashboardData.openTrend}
                    onClick={() => onCardClick?.('OPEN')}
                />
                <DashboardStatCard 
                    title="Active PO Value" 
                    value={dashboardData.openPOValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })} 
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-red-500" />} 
                    indicatorColor="bg-red-500"
                    trend={dashboardData.valueTrend}
                    onClick={() => onCardClick?.('OPEN')}
                />
                <DashboardStatCard 
                    title="Ready to Execute" 
                    value={dashboardData.fullyAvailablePOs} 
                    subValue={dashboardData.fullyAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })}
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} 
                    indicatorColor="bg-green-500"
                    trend={dashboardData.fullyTrend}
                    onClick={() => onCardClick?.('FULLY_AVAILABLE')}
                />
                <DashboardStatCard 
                    title="Partially Available" 
                    value={dashboardData.partiallyAvailablePOs} 
                    subValue={dashboardData.partiallyAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })}
                    icon={<TruckIcon className="w-6 h-6 text-blue-500" />} 
                    indicatorColor="bg-blue-500"
                    trend={dashboardData.partialTrend}
                    onClick={() => onCardClick?.('PARTIALLY_AVAILABLE')}
                />
                <DashboardStatCard 
                    title="100% Not Available" 
                    value={dashboardData.notAvailablePOs} 
                    subValue={dashboardData.notAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' })}
                    icon={<NoSymbolIcon className="w-6 h-6 text-red-600" />} 
                    indicatorColor="bg-red-600"
                    trend={dashboardData.notAvailableTrend}
                    onClick={() => onCardClick?.('NOT_AVAILABLE')}
                />
            </div>

            {/* Detailed Fulfillment Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div 
                    onClick={() => onCardClick?.('ANY_SHORTAGE')}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-md border border-slate-700 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <NoSymbolIcon className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Total Not Available Value</h3>
                            <div className="p-2 bg-red-600 rounded-lg">
                                <NoSymbolIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-black text-white">
                                {dashboardData.totalNotAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}
                            </p>
                            <p className="text-lg font-bold text-red-400">Total Gap</p>
                        </div>
                        <p className="text-sm text-slate-400 font-medium mb-4">
                            Combined value of <span className="text-red-400 font-bold">all missing items</span> across Partial and 100% Not Available POs.
                        </p>
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Partial PO Gap: {dashboardData.partialNotAvailableItemsValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                100% Not Avail Gap: {dashboardData.notAvailableValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => onCardClick?.('OIL_STUCK')}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-md border border-slate-700 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <BeakerIcon className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Oil-Stuck POs</h3>
                            <div className="p-2 bg-red-500 rounded-lg">
                                <SparklesIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-black text-white">{dashboardData.oilStuckPOs}</p>
                            <p className="text-lg font-bold text-red-400">POs</p>
                        </div>
                        <p className="text-sm text-slate-400 font-medium mb-4">
                            Orders where <span className="text-green-400 font-bold">all parts are available</span> except for <span className="text-red-400 font-bold">Valvoline Oil</span>.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest bg-white/10 px-3 py-2 rounded-lg w-fit">
                            <CurrencyRupeeIcon className="w-4 h-4 text-red-500" />
                            Value: {dashboardData.oilStuckValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-6 mb-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                 <ChartContainer title="Fulfillment Status (by Value)">
                    <DonutChart data={dashboardData.fulfillmentChartData} />
                 </ChartContainer>
                 <ChartContainer title="Checklist Compliance (by PO Count)">
                    <DonutChart data={dashboardData.checklistChartData} />
                 </ChartContainer>
                 <ChartContainer title="Value by Payment Terms">
                    <DonutChart data={dashboardData.paymentTermsChartData} />
                 </ChartContainer>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                 <ChartContainer title="Active PO Ageing (by PO Count)">
                    <HorizontalBarChart data={dashboardData.poAgeingChartData} />
                 </ChartContainer>
                 <ChartContainer title="Active PO Ageing (by Value)">
                    <HorizontalBarChart data={dashboardData.poAgeingValueChartData} isCurrency />
                 </ChartContainer>
                 <ChartContainer title="Branch Performance (by Value)">
                    <HorizontalBarChart data={dashboardData.branchPerformanceChartData} isCurrency />
                 </ChartContainer>
            </div>

            <ChartContainer title="Top 5 Customers (by Value)">
                <HorizontalBarChart data={dashboardData.topCustomers} isCurrency />
            </ChartContainer>

            {/* Operational Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Critical Part Shortages List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <NoSymbolIcon className="w-4 h-4 text-red-500" />
                            Parts Requiring Primary Order (Not Available)
                        </h3>
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                            Sorted by Value
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">Part Number</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {dashboardData.unavailablePartsList.slice(0, 20).map((part, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => onCardClick?.('PART_SHORTAGE', part.partNumber)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{part.partNumber}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{part.description}</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-500">{part.quantity}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                            {part.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                                {dashboardData.unavailablePartsList.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No critical shortages found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Oil-Stuck Orders List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-amber-500" />
                            Oil-Stuck Orders
                        </h3>
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                            Ready if Oil Available
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">PO Number</th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {dashboardData.oilStuckPOsList.map((po, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{po.poNumber}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{po.customerName}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(po.poDate).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                            {po.items.reduce((acc, i) => acc + (i.quantity * i.rate), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                                {dashboardData.oilStuckPOsList.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No oil-stuck orders found</td>
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

export default Dashboard;
