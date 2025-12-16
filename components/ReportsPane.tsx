
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, OverallPOStatus, FulfillmentStatus, OrderStatus, POItemStatus } from '../types';
import { exportToCSV } from '../utils/export';
import { ArrowDownTrayIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, TruckIcon, ChartBarIcon } from './icons';

interface ReportsPaneProps {
    purchaseOrders: PurchaseOrder[];
    onUpdatePO: (po: PurchaseOrder) => void;
}

type TabType = 'general' | 'missingOA' | 'dispatchPending' | 'valvolineTracker';

const ReportsPane: React.FC<ReportsPaneProps> = ({ purchaseOrders, onUpdatePO }) => {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    
    // General Tab State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // General Filter Logic
    const filteredGeneralPOs = useMemo(() => {
        return purchaseOrders.filter(po => {
            if (startDate && new Date(po.poDate) < new Date(startDate)) return false;
            if (endDate && new Date(po.poDate) > new Date(endDate)) return false;
            if (statusFilter && po.status !== statusFilter) return false;
            return true;
        });
    }, [purchaseOrders, startDate, endDate, statusFilter]);

    // Missing OA Logic
    const missingOAData = useMemo(() => {
        const results: { po: PurchaseOrder, items: any[] }[] = [];
        
        purchaseOrders.forEach(po => {
            // Check only Partial or Not Available POs
            if (po.fulfillmentStatus === FulfillmentStatus.Partial || po.fulfillmentStatus === FulfillmentStatus.NotAvailable) {
                const missingItems = po.items.filter(item => {
                    const isUnavailable = item.status === POItemStatus.NotAvailable || item.stockStatus === 'Unavailable';
                    // Condition: Item is unavailable AND (OA No is missing OR OA Date is missing)
                    return isUnavailable && (!item.oaNo || !item.oaDate);
                });

                if (missingItems.length > 0) {
                    results.push({ po, items: missingItems });
                }
            }
        });
        return results;
    }, [purchaseOrders]);

    // Dispatch Pending Logic (Fully Available but Not Shipped)
    const dispatchPendingPOs = useMemo(() => {
        return purchaseOrders.filter(po => {
            const isFullyAvailable = po.fulfillmentStatus === FulfillmentStatus.Fulfillment;
            const isNotShipped = po.orderStatus !== OrderStatus.ShippedInSystemDC && po.orderStatus !== OrderStatus.Invoiced;
            return isFullyAvailable && isNotShipped;
        });
    }, [purchaseOrders]);
    
    // Valvoline Tracker Logic
    const valvolineData = useMemo(() => {
        const results: { po: PurchaseOrder, items: any[] }[] = [];
        
        purchaseOrders.forEach(po => {
            // Filter by PO status as requested: Partially or Not Available
            if (po.fulfillmentStatus === FulfillmentStatus.Partial || po.fulfillmentStatus === FulfillmentStatus.NotAvailable) {
                const valvolineItems = po.items.filter(item => 
                    (item.itemDesc || '').toLowerCase().includes('valvoline')
                );
                
                if (valvolineItems.length > 0) {
                    results.push({ po, items: valvolineItems });
                }
            }
        });
        return results;
    }, [purchaseOrders]);

    const valvolineStats = useMemo(() => {
        let partialQty = 0;
        let notAvailableQty = 0;
        let totalItems = 0;

        valvolineData.forEach(({ po, items }) => {
            items.forEach(item => {
                totalItems++;
                if (po.fulfillmentStatus === FulfillmentStatus.Partial) {
                    partialQty += item.quantity;
                } else if (po.fulfillmentStatus === FulfillmentStatus.NotAvailable) {
                    notAvailableQty += item.quantity;
                }
            });
        });
        return { partialQty, notAvailableQty, totalItems };
    }, [valvolineData]);

    // Local state for remarks editing in Dispatch Pending tab
    const [remarksEdits, setRemarksEdits] = useState<Record<string, string>>({});

    const handleRemarkChange = (poId: string, val: string) => {
        setRemarksEdits(prev => ({ ...prev, [poId]: val }));
    };

    const handleSaveRemark = (po: PurchaseOrder) => {
        const newRemark = remarksEdits[po.id];
        if (newRemark !== undefined) {
            onUpdatePO({ ...po, dispatchRemarks: newRemark });
            alert('Remark saved successfully.');
        }
    };

    // Custom Export for Missing OA
    const exportMissingOA = () => {
        // Flatten structure for CSV
        const rows: any[] = [];
        missingOAData.forEach(({ po, items }) => {
            items.forEach(item => {
                rows.push({
                    'PO Number': po.poNumber,
                    'Date': po.poDate,
                    'Customer': po.customerName,
                    'Part Number': item.partNumber,
                    'Qty': item.quantity,
                    'Item Status': item.status,
                    'OA No': item.oaNo || 'MISSING',
                    'OA Date': item.oaDate || 'MISSING'
                });
            });
        });

        if (rows.length === 0) return alert("No data to export");

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csvContent = `${headers}\n${csvRows}`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'missing_oa_report.csv';
        link.click();
    };

    // Custom Export for Dispatch Pending
    const exportDispatchPending = () => {
        const rows = dispatchPendingPOs.map(po => ({
            'PO Number': po.poNumber,
            'Date': po.poDate,
            'Customer': po.customerName,
            'Branch': po.mainBranch,
            'Value': po.items.reduce((acc, i) => acc + (i.quantity * i.rate), 0),
            'Dispatch Remarks': remarksEdits[po.id] !== undefined ? remarksEdits[po.id] : (po.dispatchRemarks || '')
        }));

        if (rows.length === 0) return alert("No data to export");

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csvContent = `${headers}\n${csvRows}`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'dispatch_pending_report.csv';
        link.click();
    };

    // Custom Export for Valvoline
    const exportValvolineReport = () => {
        const rows: any[] = [];
        valvolineData.forEach(({ po, items }) => {
            items.forEach(item => {
                rows.push({
                    'PO Number': po.poNumber,
                    'Date': po.poDate,
                    'Customer': po.customerName,
                    'Branch': po.mainBranch,
                    'Part Number': item.partNumber,
                    'Description': item.itemDesc,
                    'Quantity': item.quantity,
                    'Unit Price': item.rate,
                    'Total Value': item.quantity * item.rate,
                    'PO Fulfillment Status': po.fulfillmentStatus,
                    'Item Status': item.status
                });
            });
        });

        if (rows.length === 0) return alert("No Valvoline data to export");

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csvContent = `${headers}\n${csvRows}`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'valvoline_report.csv';
        link.click();
    };


    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b dark:border-slate-700">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-red-600" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Reports Center</h2>
                        <p className="text-slate-500 dark:text-slate-400">Generate, view, and export detailed reports.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 rounded-xl bg-slate-100 dark:bg-slate-900/50 p-1 mb-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all ${
                            activeTab === 'general'
                                ? 'bg-white dark:bg-slate-700 shadow text-red-700 dark:text-red-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        General Data Export
                    </button>
                    <button
                        onClick={() => setActiveTab('missingOA')}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'missingOA'
                                ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <ExclamationTriangleIcon className="w-4 h-4" /> Missing OA Report
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatchPending')}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'dispatchPending'
                                ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <TruckIcon className="w-4 h-4" /> Ready to Ship
                    </button>
                    <button
                        onClick={() => setActiveTab('valvolineTracker')}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'valvolineTracker'
                                ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <ChartBarIcon className="w-4 h-4" /> Valvoline Tracker
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500">
                                        <option value="">All Statuses</option>
                                        {Object.values(OverallPOStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-slate-600 dark:text-slate-400">
                                    Total Matching Records: <span className="font-bold text-slate-800 dark:text-white">{filteredGeneralPOs.length}</span>
                                </p>
                                <button
                                    onClick={() => exportToCSV(filteredGeneralPOs)}
                                    className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    Export Filtered Data
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- MISSING OA TAB --- */}
                    {activeTab === 'missingOA' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">
                                    Showing orders with <strong>Partial/Not Available</strong> status that are missing OA details for unavailable items.
                                </p>
                                <button onClick={exportMissingOA} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export Report
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Part Number</th>
                                            <th className="p-3">Qty</th>
                                            <th className="p-3">Item Status</th>
                                            <th className="p-3 text-red-600">Missing Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {missingOAData.length > 0 ? (
                                            missingOAData.map(({ po, items }) => (
                                                <React.Fragment key={po.id}>
                                                    {items.map((item, idx) => (
                                                        <tr key={`${po.id}-${idx}`} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-3 font-medium">{po.poNumber}</td>
                                                            <td className="p-3">{po.customerName}</td>
                                                            <td className="p-3">{item.partNumber}</td>
                                                            <td className="p-3">{item.quantity}</td>
                                                            <td className="p-3">
                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-bold text-red-500">
                                                                {!item.oaNo && "OA No. "}
                                                                {!item.oaNo && !item.oaDate && "& "}
                                                                {!item.oaDate && "OA Date"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-500">No missing OA data found! Great job.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- DISPATCH PENDING TAB --- */}
                    {activeTab === 'dispatchPending' && (
                        <div className="space-y-4 h-full flex flex-col">
                             <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">
                                    Showing orders that are <strong>Fully Available</strong> but not yet <strong>Shipped/Invoiced</strong>.
                                </p>
                                <button onClick={exportDispatchPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export Report
                                </button>
                            </div>
                             <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Value</th>
                                            <th className="p-3 w-1/3">Dispatch Remarks (Why not shipped?)</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {dispatchPendingPOs.length > 0 ? (
                                            dispatchPendingPOs.map(po => (
                                                <tr key={po.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="p-3 font-medium">{po.poNumber}</td>
                                                    <td className="p-3">{po.poDate}</td>
                                                    <td className="p-3">{po.customerName}</td>
                                                    <td className="p-3">
                                                        {po.items.reduce((acc, i) => acc + (i.quantity * i.rate), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' })}
                                                    </td>
                                                    <td className="p-3">
                                                        <textarea 
                                                            className="w-full p-2 text-sm border border-slate-300 rounded dark:bg-slate-900 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                                                            rows={2}
                                                            placeholder="Enter reason for delay..."
                                                            value={remarksEdits[po.id] !== undefined ? remarksEdits[po.id] : (po.dispatchRemarks || '')}
                                                            onChange={(e) => handleRemarkChange(po.id, e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button 
                                                            onClick={() => handleSaveRemark(po)}
                                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                                                        >
                                                            Save
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-500">No pending dispatches found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* --- VALVOLINE TRACKER TAB --- */}
                    {activeTab === 'valvolineTracker' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                                    <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Qty in Partially Available POs</p>
                                    <p className="text-3xl font-bold text-orange-800 dark:text-orange-100">{valvolineStats.partialQty}</p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">Qty in Not Available POs</p>
                                    <p className="text-3xl font-bold text-red-800 dark:text-red-100">{valvolineStats.notAvailableQty}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    Showing "Valvoline" items from orders with <strong>Partial</strong> or <strong>Not Available</strong> fulfillment status.
                                </p>
                                <button onClick={exportValvolineReport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export Report
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Item Description</th>
                                            <th className="p-3">Qty</th>
                                            <th className="p-3">Price</th>
                                            <th className="p-3">PO Status</th>
                                            <th className="p-3">Item Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {valvolineData.length > 0 ? (
                                            valvolineData.map(({ po, items }) => (
                                                <React.Fragment key={po.id}>
                                                    {items.map((item, idx) => (
                                                        <tr key={`${po.id}-${idx}`} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-3 font-medium">{po.poNumber}</td>
                                                            <td className="p-3">{po.poDate}</td>
                                                            <td className="p-3">{po.customerName}</td>
                                                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.itemDesc}</td>
                                                            <td className="p-3 font-bold">{item.quantity}</td>
                                                            <td className="p-3">
                                                                <div>
                                                                    <span className="block text-slate-800 dark:text-slate-200 font-medium">
                                                                        {item.rate.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">
                                                                        Total: {(item.quantity * item.rate).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                 <span className={`px-2 py-1 rounded-full text-xs font-semibold ${po.fulfillmentStatus === FulfillmentStatus.Partial ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                                    {po.fulfillmentStatus}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-500">{item.status}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-slate-500">No Valvoline items found in pending orders.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPane;
