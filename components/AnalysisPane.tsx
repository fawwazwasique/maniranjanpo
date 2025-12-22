
import React, { useMemo, useState } from 'react';
import { PurchaseOrder, OverallPOStatus, FulfillmentStatus, POItemStatus } from '../types';
import { ChartBarIcon, CheckCircleIcon, ClockIcon, TruckIcon, ChartPieIcon, SparklesIcon, XMarkIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from './icons';

interface AnalysisPaneProps {
  purchaseOrders: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string }> = ({ title, value, icon, subtext }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-slate-100 dark:border-slate-700">
        <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
            {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

const ImpactCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div 
        onClick={onClick}
        className={`p-6 rounded-xl shadow-md border-l-4 ${color} bg-white dark:bg-slate-800 transition-all ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95' : ''}`}
    >
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs tracking-wider leading-tight">{title}</span>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700">{icon}</div>
        </div>
        <p className="text-4xl font-black text-slate-800 dark:text-white">{value}</p>
        {onClick && (
             <div className="mt-3 flex items-center text-xs font-bold text-slate-400 uppercase tracking-tighter">
                Click to view details <span className="ml-1">→</span>
            </div>
        )}
    </div>
);

const ClosableOrdersModal: React.FC<{ isOpen: boolean; onClose: () => void; orders: PurchaseOrder[]; onSelectPO?: (po: PurchaseOrder) => void }> = ({ isOpen, onClose, orders, onSelectPO }) => {
    if (!isOpen) return null;

    const handleExport = () => {
        const headers = ['PO Number', 'Customer', 'Date', 'Branch', 'Total Value'];
        const rows = orders.map(po => [
            po.poNumber,
            po.customerName,
            po.poDate,
            po.mainBranch || 'N/A',
            po.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.rate)), 0).toFixed(2)
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `oil_fulfillment_priority_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pending Oil Fulfillment</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">These POs are currently held up ONLY by oil items.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                         <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                            <tr>
                                <th className="p-4 rounded-tl-lg">PO Number</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4 text-right">Total Value</th>
                                <th className="p-4 text-center rounded-tr-lg">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {orders.map(po => (
                                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-white">{po.poNumber}</td>
                                    <td className="p-4">{po.customerName}</td>
                                    <td className="p-4 text-right font-semibold">
                                        {po.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.rate)), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => {
                                                onSelectPO?.(po);
                                                onClose();
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shadow-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-600 bg-white border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

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

const AnalysisPane: React.FC<AnalysisPaneProps> = ({ purchaseOrders, onSelectPO }) => {
    const [showClosableModal, setShowClosableModal] = useState(false);

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

        // --- Valvoline (Oil) Impact Calculation ---
        const closablePOs: PurchaseOrder[] = [];
        let valvolineRecoveryValue = 0;

        purchaseOrders.forEach(po => {
            const isPending = po.fulfillmentStatus === FulfillmentStatus.Partial || po.fulfillmentStatus === FulfillmentStatus.NotAvailable;
            if (!isPending) return;

            const valvolineItems = po.items.filter(i => (i.itemDesc || '').toLowerCase().includes('valvoline'));
            const nonValvolineItems = po.items.filter(i => !(i.itemDesc || '').toLowerCase().includes('valvoline'));

            const hasUnavailableValvoline = valvolineItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
            const hasUnavailableNonValvoline = nonValvolineItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);

            if (hasUnavailableValvoline) {
                // If Valvoline is the ONLY thing missing (nothing else is unavailable)
                if (!hasUnavailableNonValvoline) {
                    closablePOs.push(po);
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
                closableOrders: closablePOs,
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

            {/* Valvoline (Oil) Impact Section */}
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
                        <span className="ml-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold uppercase tracking-widest border border-red-500/30">Stock Gap Recovery</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImpactCard 
                            title="Total Orders Where only oil is Required" 
                            value={stats.valvolineImpact.closableOrders.length} 
                            color="border-green-500" 
                            icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}
                            onClick={() => setShowClosableModal(true)}
                        />
                        <ImpactCard 
                            title="Potential Closure Value" 
                            value={stats.valvolineImpact.value.toLocaleString('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2, notation: 'compact'})} 
                            color="border-blue-500" 
                            icon={<TruckIcon className="w-6 h-6 text-blue-500" />}
                        />
                    </div>

                    <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <p className="text-lg text-slate-200 leading-relaxed">
                            If all oil stock is received, <strong>{stats.valvolineImpact.closableOrders.length}</strong> pending orders can be moved to fulfillment immediately.
                        </p>
                        <p className="text-sm text-slate-400 mt-2 leading-relaxed italic">
                            * This analysis accounts for orders where <strong>all other components</strong> are available and oil is the sole remaining requirement.
                        </p>
                    </div>
                </div>
            </div>

            {/* Drill-down Modal */}
            <ClosableOrdersModal 
                isOpen={showClosableModal} 
                onClose={() => setShowClosableModal(false)} 
                orders={stats.valvolineImpact.closableOrders}
                onSelectPO={onSelectPO}
            />

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
