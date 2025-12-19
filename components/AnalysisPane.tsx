
import React, { useMemo } from 'react';
import { PurchaseOrder, OverallPOStatus, FulfillmentStatus, POItemStatus } from '../types';
import { ChartBarIcon, CheckCircleIcon, ClockIcon, TruckIcon, ChartPieIcon, SparklesIcon } from './icons';

interface AnalysisPaneProps {
  purchaseOrders: PurchaseOrder[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string }> = ({ title, value, icon, subtext }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-slate-100 dark:border-slate-700">
        <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

const ImpactCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className={`p-6 rounded-xl shadow-md border-l-4 ${color} bg-white dark:bg-slate-800`}>
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs tracking-wider">{title}</span>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700">{icon}</div>
        </div>
        <p className="text-4xl font-black text-slate-800 dark:text-white">{value}</p>
    </div>
);

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[], colorClass: string, isCurrency?: boolean }> = ({ data, colorClass, isCurrency = false }) => {
    if (data.length === 0) {
        return <div className="flex items-center justify-center h-40 text-slate-500">No data to display</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);

    const formatValue = (value: number) => {
        if (isCurrency) {
            return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact' });
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
        const totalValue = purchaseOrders.reduce((acc, po) => acc + po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0), 0);
        const avgOrderValue = totalPOs > 0 ? totalValue / totalPOs : 0;
        
        const valueByBranch = purchaseOrders.reduce((acc, po) => {
            if (!po.mainBranch) return acc;
            const value = po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0);
            acc[po.mainBranch] = (acc[po.mainBranch] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        const valueOverTime = purchaseOrders.reduce((acc, po) => {
            if (!po.poDate) return acc;
            const date = new Date(po.poDate);
            if (isNaN(date.getTime())) return acc;
            const monthKey = date.toISOString().slice(0, 7); 
            const value = po.items.reduce((itemAcc, item) => itemAcc + (Number(item.quantity) * Number(item.rate)), 0);
            acc[monthKey] = (acc[monthKey] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        const sortedValueOverTime = Object.entries(valueOverTime)
            .map(([label, value]) => ({ date: new Date(label), value}))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({date, value}) => ({
                label: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                value
            }));

        // --- Valvoline Impact Calculation ---
        let valvolineBlockedPOsCount = 0;
        let valvolinePotentialClosuresCount = 0;
        let valvolineRecoveryValue = 0;

        purchaseOrders.forEach(po => {
            const isPending = po.fulfillmentStatus === FulfillmentStatus.Partial || po.fulfillmentStatus === FulfillmentStatus.NotAvailable;
            if (!isPending) return;

            const valvolineItems = po.items.filter(i => (i.itemDesc || '').toLowerCase().includes('valvoline'));
            const nonValvolineItems = po.items.filter(i => !(i.itemDesc || '').toLowerCase().includes('valvoline'));

            const hasUnavailableValvoline = valvolineItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
            const hasUnavailableNonValvoline = nonValvolineItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);

            if (hasUnavailableValvoline) {
                valvolineBlockedPOsCount++;
                
                // If Valvoline is the ONLY thing missing (nothing else is unavailable)
                if (!hasUnavailableNonValvoline) {
                    valvolinePotentialClosuresCount++;
                    valvolineRecoveryValue += po.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.rate)), 0);
                }
            }
        });

        return {
            totalPOs,
            totalValue,
            avgOrderValue,
            valueByBranch: Object.entries(valueByBranch).map(([label, value]) => ({ label, value })).sort((a,b) => Number(b.value) - Number(a.value)),
            valueOverTime: sortedValueOverTime,
            valvolineImpact: {
                blocked: valvolineBlockedPOsCount,
                closable: valvolinePotentialClosuresCount,
                value: valvolineRecoveryValue
            }
        };
    }, [purchaseOrders]);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total POs" value={stats.totalPOs} icon={<ChartBarIcon className="w-6 h-6 text-red-500" />} />
                <StatCard title="Total PO Value" value={stats.totalValue.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact'})} icon={<TruckIcon className="w-6 h-6 text-red-500" />} />
                <StatCard title="Avg. Order Value" value={stats.avgOrderValue.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact'})} icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />} />
                <StatCard title="Top Performing Branch" value={stats.valueByBranch[0]?.label || 'N/A'} icon={<ClockIcon className="w-6 h-6 text-amber-500" />} />
            </div>

            {/* Valvoline Impact Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-slate-700">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <SparklesIcon className="w-64 h-64 text-white" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-red-500 rounded-lg">
                            <ChartPieIcon className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white">Valvoline Impact Analysis</h2>
                        <span className="ml-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold uppercase tracking-widest border border-red-500/30">What-If Tracker</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ImpactCard 
                            title="Orders Blocked by Valvoline" 
                            value={stats.valvolineImpact.blocked} 
                            color="border-amber-500" 
                            icon={<ClockIcon className="w-6 h-6 text-amber-500" />}
                        />
                        <ImpactCard 
                            title="Closable Orders (Sole Blocker)" 
                            value={stats.valvolineImpact.closable} 
                            color="border-green-500" 
                            icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}
                        />
                        <ImpactCard 
                            title="Potential Closure Value" 
                            value={stats.valvolineImpact.value.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact'})} 
                            color="border-blue-500" 
                            icon={<TruckIcon className="w-6 h-6 text-blue-500" />}
                        />
                    </div>

                    <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-200">Closure Efficiency</h3>
                            <span className="text-2xl font-black text-green-400">
                                {stats.valvolineImpact.blocked > 0 
                                    ? Math.round((stats.valvolineImpact.closable / stats.valvolineImpact.blocked) * 100) 
                                    : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                style={{ width: `${stats.valvolineImpact.blocked > 0 ? (stats.valvolineImpact.closable / stats.valvolineImpact.blocked) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="text-sm text-slate-400 mt-4 leading-relaxed italic">
                            * Analysis shows that if Valvoline stock is fulfilled, <strong>{stats.valvolineImpact.closable}</strong> orders will transition directly to "Fully Available" (Fulfillment) status immediately, unlocking <strong>{stats.valvolineImpact.value.toLocaleString('en-IN', {style: 'currency', currency: 'INR', notation: 'compact'})}</strong> in revenue.
                        </p>
                    </div>
                </div>
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-white">PO Value Over Time</h2>
                    <SimpleBarChart data={stats.valueOverTime} colorClass="bg-gradient-to-r from-green-400 to-green-500" isCurrency />
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                     <h2 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-white">Total Value by Main Branch</h2>
                     <SimpleBarChart data={stats.valueByBranch} colorClass="bg-gradient-to-r from-red-500 to-red-600" isCurrency />
                </div>
            </div>

        </div>
    );
};

export default AnalysisPane;
