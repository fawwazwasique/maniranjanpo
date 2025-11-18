import React, { useMemo } from 'react';
import { PurchaseOrder, OverallPOStatus } from '../types';
import { ChartBarIcon, CheckCircleIcon, ClockIcon, TruckIcon } from './icons';

interface AnalysisPaneProps {
  purchaseOrders: PurchaseOrder[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4">
        <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[], colorClass: string, isCurrency?: boolean }> = ({ data, colorClass, isCurrency = false }) => {
    if (data.length === 0) {
        return <div className="flex items-center justify-center h-40 text-slate-500">No data to display</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);

    const formatValue = (value: number) => {
        if (isCurrency) {
            return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' });
        }
        return value.toLocaleString('en-IN');
    };

    return (
        <div className="space-y-4">
            {data.map(item => (
                <div key={item.label} className="grid grid-cols-4 gap-4 items-center">
                    <div className="col-span-1 text-base text-slate-600 dark:text-slate-400 text-right truncate" title={item.label}>{item.label}</div>
                    <div className="col-span-3">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 flex items-center">
                            <div
                                className={`${colorClass} h-8 rounded-full flex items-center justify-end px-2 transition-all duration-500`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            >
                               <span className="text-base font-medium text-white">{formatValue(item.value)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AnalysisPane: React.FC<AnalysisPaneProps> = ({ purchaseOrders }) => {
    const stats = useMemo(() => {
        const totalPOs = purchaseOrders.length;
        // FIX: Explicitly cast quantity and rate to Number to prevent type errors from Firestore data.
        const totalValue = purchaseOrders.reduce((acc, po) => acc + po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0), 0);
        const avgOrderValue = totalPOs > 0 ? totalValue / totalPOs : 0;
        
        const valueByBranch = purchaseOrders.reduce((acc, po) => {
            if (!po.mainBranch) return acc;
            // FIX: Explicitly cast quantity and rate to Number to prevent type errors from Firestore data.
            const value = po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0);
            acc[po.mainBranch] = (acc[po.mainBranch] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        // FIX: Refactor date handling to be more robust and avoid parsing locale-dependent strings.
        // Group by 'YYYY-MM' for reliable sorting, then format for display.
        const valueOverTime = purchaseOrders.reduce((acc, po) => {
            // Guard against invalid poDate values
            if (!po.poDate) return acc;
            const date = new Date(po.poDate);
            if (isNaN(date.getTime())) return acc;

            const monthKey = date.toISOString().slice(0, 7); // "YYYY-MM"
            // FIX: Explicitly cast quantity and rate to Number to prevent type errors from Firestore data.
            const value = po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0);
            acc[monthKey] = (acc[monthKey] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        // Sort valueOverTime by date for chronological order
        const sortedValueOverTime = Object.entries(valueOverTime)
            .map(([label, value]) => ({ date: new Date(label), value})) // "YYYY-MM" is valid for Date constructor
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({date, value}) => ({
                label: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                value
            }));

        return {
            totalPOs,
            totalValue,
            avgOrderValue,
            // FIX: Explicitly cast values to Number in the sort function to resolve a TypeScript type error.
            valueByBranch: Object.entries(valueByBranch).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value)),
            valueOverTime: sortedValueOverTime,
        };
    }, [purchaseOrders]);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total POs" value={stats.totalPOs} icon={<ChartBarIcon className="w-6 h-6 text-red-500" />} />
                <StatCard title="Total PO Value" value={stats.totalValue.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0})} icon={<TruckIcon className="w-6 h-6 text-red-500" />} />
                <StatCard title="Avg. Order Value" value={stats.avgOrderValue.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0})} icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} />
                <StatCard title="Top Performing Branch" value={stats.valueByBranch[0]?.label || 'N/A'} icon={<ClockIcon className="w-6 h-6 text-amber-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-6">PO Value Over Time</h2>
                    <SimpleBarChart data={stats.valueOverTime} colorClass="bg-gradient-to-r from-green-400 to-green-500" isCurrency />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                     <h2 className="text-2xl font-semibold mb-6">Total Value by Main Branch</h2>
                     <SimpleBarChart data={stats.valueByBranch} colorClass="bg-gradient-to-r from-red-500 to-red-600" isCurrency />
                </div>
            </div>

        </div>
    );
};

export default AnalysisPane;