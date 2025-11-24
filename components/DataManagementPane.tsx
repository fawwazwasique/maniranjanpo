
import React, { useState, useMemo } from 'react';
import { PurchaseOrder } from '../types';
import { MAIN_BRANCHES, BRANCH_STRUCTURE } from '../constants';
import { TrashIcon, DatabaseIcon } from './icons';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';

interface DataManagementPaneProps {
  purchaseOrders: PurchaseOrder[];
}

const DataManagementPane: React.FC<DataManagementPaneProps> = ({ purchaseOrders }) => {
    const [selectedMainBranch, setSelectedMainBranch] = useState('');
    const [selectedSubBranch, setSelectedSubBranch] = useState('');
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredCount = useMemo(() => {
        if (!selectedMainBranch) return 0;
        return purchaseOrders.filter(po => {
            if (po.mainBranch !== selectedMainBranch) return false;
            if (selectedSubBranch && po.subBranch !== selectedSubBranch) return false;
            return true;
        }).length;
    }, [purchaseOrders, selectedMainBranch, selectedSubBranch]);

    const handleMainBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMainBranch(e.target.value);
        setSelectedSubBranch('');
    };

    const handleDeleteClick = () => {
        if (filteredCount === 0) return;
        setConfirmationOpen(true);
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
            
            // Add PO refs
            poSnapshot.docs.forEach(d => refsToDelete.push(d.ref));

            // Fetch logs and notifications concurrently
            // NOTE: For large datasets, this might need more robust batching/pagination.
            // We'll iterate the IDs to fetch related docs.
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

            // Perform Batch Deletes (limit 500 operations per batch)
            const CHUNK_SIZE = 400; // Safe margin
            let deletedCount = 0;
            for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
                deletedCount += chunk.length;
            }

            // Simple user feedback
            // We use a small timeout to let the UI update if needed before alerting
            setTimeout(() => {
                alert(`Successfully deleted ${filteredCount} orders and related data.`);
                setSelectedMainBranch('');
                setSelectedSubBranch('');
            }, 100);

        } catch (error) {
            console.error("Error deleting data:", error);
            alert("An error occurred while deleting data. Check console for details.");
        } finally {
            setIsDeleting(false);
            setConfirmationOpen(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b dark:border-slate-700">
                    <DatabaseIcon className="w-8 h-8 text-red-600" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Data Management</h2>
                        <p className="text-slate-500 dark:text-slate-400">Bulk delete orders by branch</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label htmlFor="deleteMainBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Main Branch</label>
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
                        <label htmlFor="deleteSubBranch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub Branch (Optional)</label>
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
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800/50 mb-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                            <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-slate-800 dark:text-slate-100">
                                Found <span className="text-red-600 dark:text-red-400 font-bold text-2xl mx-1">{filteredCount}</span> orders
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                for <span className="font-semibold">{selectedMainBranch}</span>
                                {selectedSubBranch && <span> / {selectedSubBranch}</span>}
                            </p>
                        </div>
                        <button
                            onClick={handleDeleteClick}
                            disabled={filteredCount === 0 || isDeleting}
                            className="px-6 py-3 text-base font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete All Matching Data'}
                        </button>
                        <p className="text-xs text-red-500 dark:text-red-400 max-w-md">
                            Warning: This action will permanently delete all purchase orders, logs, and notifications associated with the selected branch. This cannot be undone.
                        </p>
                    </div>
                )}

                <ConfirmationModal
                    isOpen={confirmationOpen}
                    onClose={() => !isDeleting && setConfirmationOpen(false)}
                    onConfirm={handleDelete}
                    title="Confirm Bulk Deletion"
                >
                    <div className="space-y-2">
                        <p>Are you sure you want to delete <strong>{filteredCount}</strong> orders for <strong>{selectedMainBranch} {selectedSubBranch ? `/ ${selectedSubBranch}` : ''}</strong>?</p>
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-2">
                            This action is irreversible. All associated data (logs, notifications) will also be removed.
                        </p>
                    </div>
                </ConfirmationModal>
            </div>
        </div>
    );
};

export default DataManagementPane;
