
import React, { useMemo, useState } from 'react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
    TrendingUp, Package, AlertCircle, CheckCircle2, 
    IndianRupee, ClipboardList, Download, Share2, Layers
} from 'lucide-react';
import type { PurchaseOrder } from '../types';
import { OrderStatus, FulfillmentStatus } from '../types';
import { getPOFulfillmentStatus, getPOValue } from '../utils/poUtils';
import { exportToCSV } from '../utils/export';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ManagementPaneProps {
    purchaseOrders: PurchaseOrder[];
}

const ManagementPane: React.FC<ManagementPaneProps> = ({ purchaseOrders }) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // 1. Extract unique categories (LOBs)
    const categories = useMemo(() => {
        const cats = new Set<string>();
        purchaseOrders.forEach(po => {
            po.items.forEach(item => {
                if (item.category) cats.add(item.category);
            });
        });
        return Array.from(cats).sort();
    }, [purchaseOrders]);

    // 2. Filter for Active POs (Open Orders)
    const activePOs = useMemo(() => {
        const openOrders = purchaseOrders.filter(po => po.orderStatus === OrderStatus.OpenOrders);
        
        if (selectedCategories.length === 0) return openOrders;

        // If specific categories are selected, we only care about POs that have items in those categories
        return openOrders.filter(po => 
            po.items.some(item => selectedCategories.includes(item.category))
        );
    }, [purchaseOrders, selectedCategories]);

    // 3. Calculate Metrics
    const metrics = useMemo(() => {
        const totalActiveCount = activePOs.length;
        let totalActiveValue = 0;
        let fullyAvailableValue = 0;
        let partiallyAvailableValue = 0;
        let notAvailableValue = 0;

        activePOs.forEach(po => {
            const val = getPOValue(po, selectedCategories);
            const status = getPOFulfillmentStatus(po, selectedCategories);
            
            totalActiveValue += val;
            if (status === FulfillmentStatus.Available) fullyAvailableValue += val;
            else if (status === FulfillmentStatus.PartiallyAvailable) partiallyAvailableValue += val;
            else if (status === FulfillmentStatus.NotAvailable) notAvailableValue += val;
        });

        return {
            totalActiveCount,
            totalActiveValue,
            fullyAvailableValue,
            partiallyAvailableValue,
            notAvailableValue
        };
    }, [activePOs, selectedCategories]);

    // 4. Chart Data
    const fulfillmentData = [
        { name: '100% Available', value: metrics.fullyAvailableValue, color: '#22c55e' },
        { name: 'Partially Available', value: metrics.partiallyAvailableValue, color: '#f59e0b' },
        { name: 'Not Available', value: metrics.notAvailableValue, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const topCustomersData = useMemo(() => {
        const customerMap: Record<string, number> = {};

        activePOs.forEach(po => {
            const val = getPOValue(po, selectedCategories);
            customerMap[po.customerName] = (customerMap[po.customerName] || 0) + val;
        });

        return Object.entries(customerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [activePOs, selectedCategories]);

    // 5. LOB Breakdown Data
    const lobBreakdownData = useMemo(() => {
        const lobMap: Record<string, { name: string, available: number, partial: number, unavailable: number, total: number }> = {};
        
        // Use all active POs regardless of filter for the breakdown section
        const openOrders = purchaseOrders.filter(po => po.orderStatus === OrderStatus.OpenOrders);

        openOrders.forEach(po => {
            po.items.forEach(item => {
                if (!item.category) return;
                
                if (!lobMap[item.category]) {
                    lobMap[item.category] = { name: item.category, available: 0, partial: 0, unavailable: 0, total: 0 };
                }
                
                const itemValue = Number(item.quantity || 0) * Number(item.rate || 0);
                lobMap[item.category].total += itemValue;
                
                if (item.status === 'Available' || item.status === 'Dispatched') {
                    lobMap[item.category].available += itemValue;
                } else if (item.status === 'Not Available') {
                    lobMap[item.category].unavailable += itemValue;
                } else {
                    lobMap[item.category].partial += itemValue;
                }
            });
        });

        return Object.values(lobMap).sort((a, b) => b.total - a.total);
    }, [purchaseOrders]);

    const formatCurrency = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
        return `₹${val.toLocaleString()}`;
    };

    const handleExport = () => {
        const catLabel = selectedCategories.length === 0 ? 'all' : selectedCategories.join('_').toLowerCase();
        exportToCSV(activePOs, `management_active_orders_${catLabel}_report.csv`);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Dashboard link copied to clipboard!');
    };

    const toggleCategory = (cat: string) => {
        if (cat === 'All') {
            setSelectedCategories([]);
            return;
        }

        setSelectedCategories(prev => {
            if (prev.includes(cat)) {
                return prev.filter(c => c !== cat);
            } else {
                return [...prev, cat];
            }
        });
    };

    const categoryLabel = selectedCategories.length === 0 
        ? 'All Categories' 
        : selectedCategories.length === 1 
            ? selectedCategories[0] 
            : `${selectedCategories.length} Categories`;

    return (
        <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Management Status</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time operational health and financial exposure overview.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Share2 className="w-4 h-4" />
                        Share View
                    </button>
                </div>
            </div>

            {/* Category / LOB Filter */}
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-800 mr-2 text-slate-400">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">LOB Filter:</span>
                </div>
                <button
                    onClick={() => toggleCategory('All')}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                        selectedCategories.length === 0 
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            selectedCategories.includes(cat)
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard 
                    title="Total Active POs" 
                    value={metrics.totalActiveCount} 
                    icon={<ClipboardList className="w-5 h-5" />}
                    color="blue"
                    subtitle={selectedCategories.length > 0 ? `With selected items` : undefined}
                />
                <MetricCard 
                    title="Active Value" 
                    value={formatCurrency(metrics.totalActiveValue)} 
                    icon={<IndianRupee className="w-5 h-5" />}
                    color="indigo"
                    subtitle={selectedCategories.length > 0 ? `Selected portion` : 'Total exposure'}
                />
                <MetricCard 
                    title="100% Available" 
                    value={formatCurrency(metrics.fullyAvailableValue)} 
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    color="green"
                    subtitle={`${((metrics.fullyAvailableValue / metrics.totalActiveValue) * 100 || 0).toFixed(1)}% of ${categoryLabel}`}
                />
                <MetricCard 
                    title="Partially Available" 
                    value={formatCurrency(metrics.partiallyAvailableValue)} 
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="amber"
                    subtitle={`${((metrics.partiallyAvailableValue / metrics.totalActiveValue) * 100 || 0).toFixed(1)}% of ${categoryLabel}`}
                />
                <MetricCard 
                    title="Not Available" 
                    value={formatCurrency(metrics.notAvailableValue)} 
                    icon={<AlertCircle className="w-5 h-5" />}
                    color="red"
                    subtitle={`${((metrics.notAvailableValue / metrics.totalActiveValue) * 100 || 0).toFixed(1)}% of ${categoryLabel}`}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Fulfillment Mix */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold mb-6">Fulfillment Mix ({categoryLabel})</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={fulfillmentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {fulfillmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Customers Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold mb-6">Top Customers by {categoryLabel} Exposure</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomersData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={120} 
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* LOB Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">LOB Fulfillment Exposure</h3>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Stacked by Value</span>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lobBreakdownData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={100} 
                                    tick={{ fontSize: 11, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="top" align="right" height={36}/>
                                <Bar dataKey="available" name="Available" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="partial" name="Partial" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="unavailable" name="Unavailable" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold mb-6">LOB Summary Table</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Line of Business</th>
                                    <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Value</th>
                                    <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Availability %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {lobBreakdownData.map((lob) => {
                                    const availabilityPct = (lob.available / lob.total) * 100;
                                    return (
                                        <tr key={lob.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 font-medium text-slate-900 dark:text-white">{lob.name}</td>
                                            <td className="py-3 text-right font-mono text-sm">{formatCurrency(lob.total)}</td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                availabilityPct > 80 ? "bg-green-500" :
                                                                availabilityPct > 40 ? "bg-amber-500" : "bg-red-500"
                                                            )}
                                                            style={{ width: `${availabilityPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold w-10">{availabilityPct.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Active PO Breakdown ({categoryLabel})</h3>
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                        {activePOs.length} POs Found
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{selectedCategories.length === 0 ? 'Total Value' : `Selected Value`}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Fulfillment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activePOs.slice(0, 10).map((po) => {
                                const status = getPOFulfillmentStatus(po, selectedCategories);
                                const value = getPOValue(po, selectedCategories);
                                return (
                                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{po.customerName}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{po.poNumber}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(po.poDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrency(value)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    status === FulfillmentStatus.Available ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    status === FulfillmentStatus.PartiallyAvailable ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                )}>
                                                    {status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {activePOs.length > 10 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/30 text-center border-t border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-500">Showing top 10 orders for {categoryLabel}.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'indigo' | 'green' | 'amber' | 'red';
    subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, subtitle }) => {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30',
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-xl border", colorMap[color])}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h2>
                {subtitle && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

export default ManagementPane;
