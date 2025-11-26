
import React, { useMemo } from 'react';
import type { PurchaseOrder } from '../types';
import { OverallPOStatus, FulfillmentStatus, OrderStatus } from '../types';
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, TruckIcon, UserGroupIcon, XMarkIcon, ChartPieIcon, CalendarDaysIcon, CurrencyRupeeIcon, NoSymbolIcon, ArrowUpIcon, ArrowDownIcon } from './icons';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';

interface DashboardProps {
  purchaseOrders: PurchaseOrder[];
  filters: {
    status: string;
    customer: string;
    date: string;
    mainBranch: string;
    subBranch: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string;
    customer: string;
    date: string;
    mainBranch: string;
    subBranch: string;
  }>>;
  customers: string[];
}

interface TrendData {
    value: number;
    percent: number;
    text: string;
    isPositiveGood: boolean;
}

const DashboardStatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; indicatorColor?: string; trend?: TrendData | null }> = ({ title, value, icon, indicatorColor, trend }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex items-center space-x-4 relative overflow-hidden">
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
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
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
                             const offset = (acc.sum / total) * circumference;
                             acc.sum += segment.value;
                             acc.elements.push(
                                <circle
                                    key={segment.label}
                                    cx="50" cy="50" r={radius}
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="15"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference - (segment.value / total * circumference) + offset}
                                />
                             );
                             return acc;
                        }, { sum: 0, elements: [] as React.ReactNode[] }).elements}
                    </g>
                     <text x="50" y="50" textAnchor="middle" dy=".3em" className="text-lg font-bold fill-current text-slate-800 dark:text-slate-100">
                       {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' })}
                    </text>
                </svg>
            </div>
            <div className="space-y-2">
                {data.filter(d => d.value > 0).map(segment => (
                    <div key={segment.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: segment.color }}></span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{segment.label}</span>
                        <span className="ml-auto font-bold text-slate-700 dark:text-slate-200">
                            {segment.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
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
        ? val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })
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


const Dashboard: React.FC<DashboardProps> = ({ purchaseOrders, filters, setFilters, customers }) => {
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'mainBranch') {
            setFilters(prev => ({ ...prev, mainBranch: value, subBranch: '' }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const filteredPOs = useMemo(() => {
        return purchaseOrders
            .filter(po => filters.status ? po.status === filters.status : true)
            .filter(po => filters.customer ? po.customerName.toLowerCase().includes(filters.customer.toLowerCase()) : true)
            .filter(po => filters.date ? new Date(po.poDate).toISOString().split('T')[0] === filters.date : true)
            .filter(po => filters.mainBranch ? po.mainBranch === filters.mainBranch : true)
            .filter(po => filters.subBranch ? po.subBranch === filters.subBranch : true);
    }, [purchaseOrders, filters]);

    const getTrend = (
        allPOs: PurchaseOrder[], 
        currentFilters: typeof filters, 
        filterFn: (po: PurchaseOrder) => boolean,
        valueFn: (pos: PurchaseOrder[]) => number,
        isPositiveGood: boolean = true
    ): TrendData | null => {
        // Filter context: Apply Customer and Branch filters, but IGNORE Date filter to get valid Month-Over-Month context
        const contextPOs = allPOs.filter(po => {
            if (currentFilters.customer && !po.customerName.toLowerCase().includes(currentFilters.customer.toLowerCase())) return false;
            if (currentFilters.mainBranch && po.mainBranch !== currentFilters.mainBranch) return false;
            if (currentFilters.subBranch && po.subBranch !== currentFilters.subBranch) return false;
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

        if (lastVal === 0) {
            return thisVal === 0 ? { value: 0, percent: 0, text: '0% MOM', isPositiveGood } : { value: 100, percent: 100, text: '100% MOM', isPositiveGood };
        }
        
        const percent = ((thisVal - lastVal) / lastVal) * 100;
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
        const openPOs = filteredPOs.filter(po => po.status === OverallPOStatus.Open || po.status === OverallPOStatus.PartiallyDispatched);
        const totalOpenPOs = openPOs.length;
        const openPOValue = openPOs.reduce((acc, po) => acc + po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0), 0);
        
        const fullyAvailablePOs = filteredPOs.filter(po => po.fulfillmentStatus === FulfillmentStatus.Fulfillment).length;
        const partiallyAvailablePOs = filteredPOs.filter(po => po.fulfillmentStatus === FulfillmentStatus.Partial).length;
        const notAvailablePOs = filteredPOs.filter(po => po.fulfillmentStatus === FulfillmentStatus.NotAvailable).length;

        // Trends
        const openTrend = getTrend(purchaseOrders, filters, p => p.status === OverallPOStatus.Open || p.status === OverallPOStatus.PartiallyDispatched, p => p.length, true);
        const valueTrend = getTrend(purchaseOrders, filters, p => p.status === OverallPOStatus.Open || p.status === OverallPOStatus.PartiallyDispatched, p => p.reduce((acc, po) => acc + po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0), 0), true);
        const fullyTrend = getTrend(purchaseOrders, filters, p => p.fulfillmentStatus === FulfillmentStatus.Fulfillment, p => p.length, true);
        const partialTrend = getTrend(purchaseOrders, filters, p => p.fulfillmentStatus === FulfillmentStatus.Partial, p => p.length, true);
        const notAvailableTrend = getTrend(purchaseOrders, filters, p => p.fulfillmentStatus === FulfillmentStatus.NotAvailable, p => p.length, false); // Increase is bad

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
            const status = po.fulfillmentStatus || 'N/A';
            const value = po.items.reduce((iAcc, i) => iAcc + (Number(i.quantity) * Number(i.rate)), 0);
            acc[status] = (acc[status] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const fulfillmentColors: Record<string, string> = { 
            [FulfillmentStatus.New]: '#6b7280', 
            [FulfillmentStatus.Partial]: '#f59e0b', 
            [FulfillmentStatus.Fulfillment]: '#22c55e', 
            [FulfillmentStatus.NotAvailable]: '#ef4444',
            [FulfillmentStatus.Release]: '#3b82f6', 
            [FulfillmentStatus.Invoiced]: '#ef4444', 
            [FulfillmentStatus.Shipped]: '#14b8a6' 
        };
        const fulfillmentChartData = Object.entries(valueByFulfillment).map(([label, value]) => ({ label, value, color: fulfillmentColors[label] || '#9ca3af' }));

        const customerValue = filteredPOs.reduce((acc, po) => {
            const value = po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0);
            acc[po.customerName] = (acc[po.customerName] || 0) + value;
            return acc;
        }, {} as { [key: string]: number });
        const topCustomers = Object.entries(customerValue).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value)).slice(0, 5);

        const valueByPayment = filteredPOs.reduce((acc, po) => {
            const type = po.saleType || 'N/A';
            const value = po.items.reduce((iAcc, i) => iAcc + (Number(i.quantity) * Number(i.rate)), 0);
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
            const poValue = po.items.reduce((iAcc, i) => iAcc + (Number(i.quantity) * Number(i.rate)), 0);

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
            const value = po.items.reduce((iAcc, i) => iAcc + (Number(i.quantity) * Number(i.rate)), 0);
            acc[branch] = (acc[branch] || 0) + value;
            return acc;
        }, {} as Record<string, number>);
        const branchPerformanceChartData = Object.entries(valueByBranch).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value));

        const avgPOtoSOVal = getAvgDays(filteredPOs, 'poDate', 'soDate');
        const avgSOtoInvoiceVal = getAvgDays(filteredPOs, 'soDate', 'invoiceDate');
        const avgPOtoInvoiceVal = getAvgDays(filteredPOs, 'poDate', 'invoiceDate');

        const avgPOtoSO = avgPOtoSOVal ? `${Math.round(avgPOtoSOVal)} days` : 'N/A';
        const avgSOtoInvoice = avgSOtoInvoiceVal ? `${Math.round(avgSOtoInvoiceVal)} days` : 'N/A';
        const avgPOtoInvoice = avgPOtoInvoiceVal ? `${Math.round(avgPOtoInvoiceVal)} days` : 'N/A';

        // Average Trends (Increase in days is Bad, so isPositiveGood = false)
        const avgPOtoSOTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'poDate', 'soDate'), false);
        const avgSOtoInvoiceTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'soDate', 'invoiceDate'), false);
        const avgPOtoInvoiceTrend = getTrend(purchaseOrders, filters, () => true, (pos) => getAvgDays(pos, 'poDate', 'invoiceDate'), false);

        return { 
            totalOpenPOs, openPOValue, fullyAvailablePOs, partiallyAvailablePOs, notAvailablePOs, 
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
                        <input type="text" id="customer" name="customer" value={filters.customer} onChange={handleFilterChange} list="customer-list" placeholder="All" className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                         <datalist id="customer-list">
                            {customers.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label htmlFor="mainBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Main Branch</label>
                        <select id="mainBranch" name="mainBranch" value={filters.mainBranch} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                            <option value="">All</option>
                            {MAIN_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Branch</label>
                        <select id="subBranch" name="subBranch" value={filters.subBranch} onChange={handleFilterChange} disabled={!filters.mainBranch} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:opacity-50">
                            <option value="">All</option>
                            {filters.mainBranch && BRANCH_STRUCTURE[filters.mainBranch]?.map(sb => <option key={sb} value={sb}>{sb}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select id="status" name="status" value={filters.status} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                            <option value="">All</option>
                            {Object.values(OverallPOStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">PO Date</label>
                        <input type="date" id="date" name="date" value={filters.date} onChange={handleFilterChange} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                    </div>
                     <div className="flex items-end">
                        <button onClick={() => setFilters({status: '', customer: '', date: '', mainBranch: '', subBranch: ''})} className="w-full justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center gap-2">
                           <XMarkIcon className="w-4 h-4" />
                           Clear
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
                <DashboardStatCard 
                    title="Total Open POs" 
                    value={dashboardData.totalOpenPOs} 
                    icon={<ClockIcon className="w-6 h-6 text-amber-500" />} 
                    indicatorColor="bg-amber-500"
                    trend={dashboardData.openTrend}
                />
                <DashboardStatCard 
                    title="Open PO Value" 
                    value={dashboardData.openPOValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })} 
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-red-500" />} 
                    indicatorColor="bg-red-500"
                    trend={dashboardData.valueTrend}
                />
                <DashboardStatCard 
                    title="Fully Available" 
                    value={dashboardData.fullyAvailablePOs} 
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} 
                    indicatorColor="bg-green-500"
                    trend={dashboardData.fullyTrend}
                />
                <DashboardStatCard 
                    title="Partially Available" 
                    value={dashboardData.partiallyAvailablePOs} 
                    icon={<TruckIcon className="w-6 h-6 text-blue-500" />} 
                    indicatorColor="bg-blue-500"
                    trend={dashboardData.partialTrend}
                />
                <DashboardStatCard 
                    title="Not Available" 
                    value={dashboardData.notAvailablePOs} 
                    icon={<NoSymbolIcon className="w-6 h-6 text-red-500" />} 
                    indicatorColor="bg-red-600"
                    trend={dashboardData.notAvailableTrend}
                />
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
                 <ChartContainer title="Open PO Ageing (by PO Count)">
                    <HorizontalBarChart data={dashboardData.poAgeingChartData} />
                 </ChartContainer>
                 <ChartContainer title="Open PO Ageing (by Value)">
                    <HorizontalBarChart data={dashboardData.poAgeingValueChartData} isCurrency />
                 </ChartContainer>
                 <ChartContainer title="Branch Performance (by Value)">
                    <HorizontalBarChart data={dashboardData.branchPerformanceChartData} isCurrency />
                 </ChartContainer>
            </div>

            <ChartContainer title="Top 5 Customers (by Value)">
                <HorizontalBarChart data={dashboardData.topCustomers} isCurrency />
            </ChartContainer>
        </div>
    );
};

export default Dashboard;
