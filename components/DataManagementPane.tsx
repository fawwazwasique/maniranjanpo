
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, OrderStatus } from '../types';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';
import { TrashIcon, DatabaseIcon, DocumentTextIcon } from './icons';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, writeBatch, or } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';

interface DataManagementPaneProps {
  purchaseOrders: PurchaseOrder[];
}

const DataManagementPane: React.FC<DataManagementPaneProps> = ({ purchaseOrders }) => {
    const [selectedMainBranch, setSelectedMainBranch] = useState('');
    const [selectedSubBranch, setSelectedSubBranch] = useState('');
    
    // UI state for PO deletion
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filtered invoiced data state
    const [invoiceDeleteOpen, setInvoiceDeleteOpen] = useState(false);
    const [isDeletingInvoices, setIsDeletingInvoices] = useState(false);

    const filteredCount = useMemo(() => {
        if (!selectedMainBranch) return 0;
        return purchaseOrders.filter(po => {
            if (po.mainBranch !== selectedMainBranch) return false;
            if (selectedSubBranch && po.subBranch !== selectedSubBranch) return false;
            return true;
        }).length;
    }, [purchaseOrders, selectedMainBranch, selectedSubBranch]);

    const invoicedOrdersCount = useMemo(() => {
        return purchaseOrders.filter(po => 
            po.orderStatus === OrderStatus.Invoiced
        ).length;
    }, [purchaseOrders]);

    const handleMainBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMainBranch(e.target.value);
        setSelectedSubBranch('');
    };

    const handleDeleteClick = () => {
        if (filteredCount === 0) return;
        setConfirmationOpen(true);
    };

    const handleInvoiceDeleteClick = () => {
        if (invoicedOrdersCount === 0) return;
        setInvoiceDeleteOpen(true);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const poRef = collection(db, "purchaseOrders");
            let q = query(poRef, where("mainBranch", "==", selectedMainBranch));
            if (selectedSubBranch) {
                q = query(q, where("subBranch", "==", selectedSubBranch));
            }
            const poSnapshot = await getDocs(q);

            if (poSnapshot.empty) {
                alert("No data found to delete on the server.");
                setIsDeleting(false);
                setConfirmationOpen(false);
                return;
            }

            const poIds = poSnapshot.docs.map(d => d.id);
            const refsToDelete: any[] = [];
            
            poSnapshot.docs.forEach(d => refsToDelete.push(d.ref));

            const promises = poIds.map(async (poId) => {
                const logQ = query(collection(db, "logs"), where("poId", "==", poId));
                const notifQ = query(collection(db, "notifications"), where("poId", "==", poId));
                const [logSnaps, notifSnaps] = await Promise.all([getDocs(logQ), getDocs(notifQ)]);
                return [...logSnaps.docs, ...notifSnaps.docs];
            });

            const relatedDocsResults = await Promise.all(promises);
            relatedDocsResults.forEach(docs => {
                docs.forEach(d => refsToDelete.push(d.ref));
            });

            const CHUNK_SIZE = 400;
            for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
            }

            setTimeout(() => {
                alert(`Successfully deleted ${filteredCount} orders and related data.`);
                setSelectedMainBranch('');
                setSelectedSubBranch('');
            }, 100);

        } catch (error) {
            console.error("Error deleting data:", error);
            alert("An error occurred while deleting data.");
        } finally {
            setIsDeleting(false);
            setConfirmationOpen(false);
        }
    };

    const handleInvoicedDelete = async () => {
        setIsDeletingInvoices(true);
        try {
            const poRef = collection(db, "purchaseOrders");
            // Query for only Fully Invoiced orders
            const q = query(
                poRef, 
                where("orderStatus", "==", OrderStatus.Invoiced)
            );
            
            const poSnapshot = await getDocs(q);

            if (poSnapshot.empty) {
                alert("No fully invoiced data found to delete.");
                setIsDeletingInvoices(false);
                setInvoiceDeleteOpen(false);
                return;
            }

            const poIds = poSnapshot.docs.map(d => d.id);
            const refsToDelete: any[] = [];
            
            poSnapshot.docs.forEach(d => refsToDelete.push(d.ref));

            const promises = poIds.map(async (poId) => {
                const logQ = query(collection(db, "logs"), where("poId", "==", poId));
                const notifQ = query(collection(db, "notifications"), where("poId", "==", poId));
                const [logSnaps, notifSnaps] = await Promise.all([getDocs(logQ), getDocs(notifQ)]);
                return [...logSnaps.docs, ...notifSnaps.docs];
            });

            const relatedDocsResults = await Promise.all(promises);
            relatedDocsResults.forEach(docs => {
                docs.forEach(d => refsToDelete.push(d.ref));
            });

            const CHUNK_SIZE = 400;
            for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
            }

            setTimeout(() => {
                alert(`Successfully deleted ${poSnapshot.size} fully invoiced orders and related data.`);
            }, 100);

        } catch (error) {
            console.error("Error deleting invoice data:", error);
            alert("An error occurred while deleting invoice data.");
        } finally {
            setIsDeletingInvoices(false);
            setInvoiceDeleteOpen(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-4">
                <DatabaseIcon className="w-10 h-10 text-red-600" />
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">DATA MANAGEMENT</h2>
                    <p className="text-slate-500 dark:text-slate-400">Administrative tools for bulk cleanup and maintenance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Purchase Order Cleanup Card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b dark:border-slate-700 pb-4 flex items-center gap-2">
                        <TrashIcon className="w-5 h-5 text-red-500" />
                        Order Maintenance
                    </h3>
                    <div className="space-y-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="deleteMainBranch" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-tighter">Target Main Branch</label>
                                <select 
                                    id="deleteMainBranch" 
                                    value={selectedMainBranch} 
                                    onChange={handleMainBranchChange} 
                                    className="block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                                >
                                    <option value="">Select Main Branch</option>
                                    {MAIN_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="deleteSubBranch" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-tighter">Sub Branch (Optional)</label>
                                <select 
                                    id="deleteSubBranch" 
                                    value={selectedSubBranch} 
                                    onChange={(e) => setSelectedSubBranch(e.target.value)} 
                                    disabled={!selectedMainBranch} 
                                    className="block w-full text-base px-3 py-2.5 rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
                                >
                                    <option value="">All Sub Branches</option>
                                    {selectedMainBranch && BRANCH_STRUCTURE[selectedMainBranch]?.map(sb => <option key={sb} value={sb}>{sb}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedMainBranch && (
                            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center text-center space-y-4">
                                <div>
                                    <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                                        Found <span className="text-red-600 dark:text-red-400 font-black text-3xl mx-1">{filteredCount}</span> match(es)
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest">
                                        {selectedMainBranch} {selectedSubBranch ? `/ ${selectedSubBranch}` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={filteredCount === 0 || isDeleting}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                    {isDeleting ? 'Processing...' : 'Delete Selected Records'}
                                </button>
                                <p className="text-[10px] text-red-500 dark:text-red-400 italic">
                                    Deleting orders also wipes linked activity logs and notifications.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoiced Cleanup card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b dark:border-slate-700 pb-4 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                        Invoice Cleanup
                    </h3>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-8 rounded-xl border border-purple-200 dark:border-purple-800/50 text-center space-y-6">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Total Fully Invoiced Orders</p>
                                <p className="text-6xl font-black text-purple-600 dark:text-purple-400 tracking-tighter">
                                    {invoicedOrdersCount}
                                </p>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                                Quickly remove all orders that have already been fully invoiced to clear your dashboard for active business.
                            </p>

                            <button
                                onClick={handleInvoiceDeleteClick}
                                disabled={invoicedOrdersCount === 0 || isDeletingInvoices}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-black text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <TrashIcon className="w-6 h-6" />
                                {isDeletingInvoices ? 'Processing...' : 'Wipe Invoice Data'}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                <DocumentTextIcon className="w-3 h-3" />
                                SAFE CLEANUP ONLY REMOVES BILLABLE HISTORY
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PO Deletion Confirmation */}
            <ConfirmationModal
                isOpen={confirmationOpen}
                onClose={() => !isDeleting && setConfirmationOpen(false)}
                onConfirm={handleDelete}
                title="Confirm Data Removal"
            >
                <div className="space-y-3">
                    <p className="font-medium">You are about to delete <strong>{filteredCount}</strong> purchase orders for <strong>{selectedMainBranch}</strong>.</p>
                    <p className="text-xs text-slate-500">This action is irreversible and includes all linked logs and notifications.</p>
                </div>
            </ConfirmationModal>

            {/* Invoice Deletion Confirmation */}
            <ConfirmationModal
                isOpen={invoiceDeleteOpen}
                onClose={() => !isDeletingInvoices && setInvoiceDeleteOpen(false)}
                onConfirm={handleInvoicedDelete}
                title="Wipe Invoice History?"
                confirmText="Yes, Wipe Data"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
                         <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                             <TrashIcon className="w-4 h-4" />
                             <strong>Warning: Critical Action</strong>
                         </p>
                    </div>
                    <p className="text-base">You are about to permanently remove <strong>{invoicedOrdersCount}</strong> fully invoiced orders from the system.</p>
                    <p className="text-sm text-slate-500 font-medium">This is recommended for routine maintenance to keep the production dashboard performing at its best.</p>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default DataManagementPane;
