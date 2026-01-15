
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, OverallPOStatus, FulfillmentStatus, OrderStatus, POItemStatus } from '../types';
import { exportToCSV } from '../utils/export';
import { ArrowDownTrayIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, TruckIcon, CheckCircleIcon, DatabaseIcon } from './icons';

interface ReportsPaneProps {
    purchaseOrders: PurchaseOrder[];
    onUpdatePO: (po: PurchaseOrder) => void;
}

type TabType = 'general' | 'missingOA' | 'dispatchPending' | 'oaFilled' | 'allocation';

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
            if (po.fulfillmentStatus === FulfillmentStatus.Partial || po.fulfillmentStatus === FulfillmentStatus.NotAvailable) {
                const missingItems = po.items.filter(item => {
                    const isUnavailable = item.status === POItemStatus.NotAvailable || item.stockStatus === 'Unavailable';
                    return isUnavailable && (!item.oaNo || !item.oaDate);
                });
                if (missingItems.length > 0) results.push({ po, items: missingItems });
            }
        });
        return results;
    }, [purchaseOrders]);

    // OA Filled Logic
    const oaFilledData = useMemo(() => {
        const results: { po: PurchaseOrder, items: any[] }[] = [];
        purchaseOrders.forEach(po => {
            const filledItems = po.items.filter(item => item.oaNo && item.oaDate);
            if (filledItems.length > 0) {
                results.push({ po, items: filledItems });
            }
        });
        return results;
    }, [purchaseOrders]);

    // Allocation Logic (New Report)
    const allocationData = useMemo(() => {
        const results: { po: PurchaseOrder, item: any }[] = [];
        purchaseOrders.forEach(po => {
            (po.items || []).forEach(item => {
                if ((item.allocatedQuantity || 0) > 0) {
                    results.push({ po, item });
                }
            });
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

    const exportOAFilled = () => {
        const rows: any[] = [];
        oaFilledData.forEach(({ po, items }) => {
            items.forEach(item => {
                rows.push({
                    'PO Number': po.poNumber,
                    'Date': po.poDate,
                    'Customer': po.customerName,
                    'Part Number': item.partNumber,
                    'OA No': item.oaNo,
                    'OA Date': item.oaDate,
                    'Item Status': item.status
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
        link.download = 'oa_numbers_filled_report.csv';
        link.click();
    };

    const exportMissingOA = () => {
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

    const exportAllocationReport = () => {
        const rows = allocationData.map(({ po, item }) => ({
            'PO Number': po.poNumber,
            'Customer': po.customerName,
            'Part Number': item.partNumber,
            'Allocated Qty': item.allocatedQuantity,
            'Total Required': item.quantity,
            'Item Status': item.status,
            'Branch': po.mainBranch || 'N/A'
        }));
        if (rows.length === 0) return alert("No allocation data found");
        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csvContent = `${headers}\n${csvRows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'stock_allocation_report.csv';
        link.click();
    };

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
                <div className="flex flex-wrap space-x-1 rounded-xl bg-slate-100 dark:bg-slate-900/50 p-1 mb-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 transition-all ${
                            activeTab === 'general'
                                ? 'bg-white dark:bg-slate-700 shadow text-red-700 dark:text-red-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        General Data Export
                    </button>
                    <button
                        onClick={() => setActiveTab('allocation')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'allocation'
                                ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <DatabaseIcon className="w-4 h-4" /> Allocation Report
                    </button>
                    <button
                        onClick={() => setActiveTab('oaFilled')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'oaFilled'
                                ? 'bg-white dark:bg-slate-700 shadow text-green-600 dark:text-green-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <CheckCircleIcon className="w-4 h-4" /> OA Numbers Filled
                    </button>
                    <button
                        onClick={() => setActiveTab('missingOA')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'missingOA'
                                ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <ExclamationTriangleIcon className="w-4 h-4" /> Missing OA Report
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatchPending')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 transition-all flex justify-center items-center gap-2 ${
                            activeTab === 'dispatchPending'
                                ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:bg-white/[0.12] hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <TruckIcon className="w-4 h-4" /> Ready to Ship
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none">
                                        <option value="">All Statuses</option>
                                        {Object.values(OverallPOStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-slate-600 dark:text-slate-400">Total Matching Records: <span className="font-bold text-slate-800 dark:text-white">{filteredGeneralPOs.length}</span></p>
                                <button onClick={() => exportToCSV(filteredGeneralPOs)} className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md">
                                    <ArrowDownTrayIcon className="w-5 h-5" /> Export Filtered Data
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'allocation' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">System-wide record of stock quantities assigned to specific Purchase Orders.</p>
                                <button onClick={exportAllocationReport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export Allocation Report
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Part Number</th>
                                            <th className="p-3 text-right">Allocated</th>
                                            <th className="p-3 text-right">Required</th>
                                            <th className="p-3">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {allocationData.length > 0 ? (
                                            allocationData.map(({ po, item }, idx) => {
                                                const percent = Math.min(100, Math.round((item.allocatedQuantity / item.quantity) * 100));
                                                return (
                                                    <tr key={`${po.id}-${idx}`} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="p-3 font-medium text-slate-900 dark:text-white">{po.poNumber}</td>
                                                        <td className="p-3">{po.customerName}</td>
                                                        <td className="p-3 font-bold">{item.partNumber}</td>
                                                        <td className="p-3 text-right font-black text-indigo-600">{item.allocatedQuantity}</td>
                                                        <td className="p-3 text-right">{item.quantity}</td>
                                                        <td className="p-3">
                                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-[100px]">
                                                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">{percent}%</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No stock allocations have been made yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'oaFilled' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">Total OA Entries: <span className="font-bold text-green-600">{oaFilledData.reduce((acc, d) => acc + d.items.length, 0)}</span> items across <span className="font-bold">{oaFilledData.length}</span> POs.</p>
                                <button onClick={exportOAFilled} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export OA Report
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Part Number</th>
                                            <th className="p-3">OA Number</th>
                                            <th className="p-3">OA Date</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {oaFilledData.length > 0 ? (
                                            oaFilledData.map(({ po, items }) => (
                                                <React.Fragment key={po.id}>
                                                    {items.map((item, idx) => (
                                                        <tr key={`${po.id}-${idx}`} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-3 font-medium">{po.poNumber}</td>
                                                            <td className="p-3">{po.customerName}</td>
                                                            <td className="p-3">{item.partNumber}</td>
                                                            <td className="p-3 font-bold text-green-600">{item.oaNo}</td>
                                                            <td className="p-3">{item.oaDate}</td>
                                                            <td className="p-3">{item.status}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No OA numbers have been recorded yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'missingOA' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">Missing OA details for unavailable items in pending POs.</p>
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
                                            <th className="p-3 text-red-600 font-bold">Missing Details</th>
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
                                                            <td className="p-3 font-bold text-red-500">{!item.oaNo && "OA No. "}{!item.oaNo && !item.oaDate && "& "}{!item.oaDate && "OA Date"}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No missing OA data found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'dispatchPending' && (
                        <div className="space-y-4 h-full flex flex-col">
                             <div className="flex justify-between items-center mb-2">
                                <p className="text-slate-600 dark:text-slate-400">Orders Fully Available but not yet shipped.</p>
                                <button onClick={exportDispatchPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Export Report
                                </button>
                            </div>
                             <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">PO Number</th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Value</th>
                                            <th className="p-3">Dispatch Remarks</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {dispatchPendingPOs.length > 0 ? (
                                            dispatchPendingPOs.map(po => (
                                                <tr key={po.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="p-3 font-medium">{po.poNumber}</td>
                                                    <td className="p-3">{po.customerName}</td>
                                                    <td className="p-3">{po.items.reduce((acc, i) => acc + (i.quantity * i.rate), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                                                    <td className="p-3"><textarea className="w-full p-2 text-sm border border-slate-300 rounded dark:bg-slate-900 dark:border-slate-600" rows={2} value={remarksEdits[po.id] !== undefined ? remarksEdits[po.id] : (po.dispatchRemarks || '')} onChange={(e) => handleRemarkChange(po.id, e.target.value)} /></td>
                                                    <td className="p-3 text-center"><button onClick={() => handleSaveRemark(po)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700">Save</button></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No pending dispatches.</td></tr>
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
