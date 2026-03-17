
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import POModal from './components/POModal';
import ProcurementSuggestionModal from './components/ProcurementSuggestionModal';
import Sidebar from './components/Sidebar';
import UploadPane from './components/UploadPane';
import AnalysisPane from './components/AnalysisPane';
import ConfirmationModal from './components/ConfirmationModal';
import AllOrdersPane from './components/AllOrdersPane';
import TopCustomersPane from './components/TopCustomersPane';
import DataManagementPane from './components/DataManagementPane';
import ReportsPane from './components/ReportsPane';
import ErrorBanner from './components/ErrorBanner';
import useLocalStorage from './hooks/useLocalStorage';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { getProcurementSuggestion } from './services/geminiService';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion, StockItem, StockMovement } from './types';
import { POItemStatus, OverallPOStatus, OrderStatus, FulfillmentStatus } from './types';

type ModalType = 'none' | 'poDetail' | 'suggestion';
type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement' | 'reports' | 'topCustomers';
type Theme = 'light' | 'dark';

/**
 * Strict data sanitizer. 
 * Ensures state only contains serializable JSON-friendly data.
 * Prevents internal Firestore/Firebase objects from causing circular reference errors.
 */
const sanitizeData = (data: any): any => {
    // Handle primitives immediately
    if (data === null || typeof data !== 'object') {
        return data;
    }

    // Handle Firestore Timestamp
    if (data instanceof Timestamp || (data && typeof data.toDate === 'function')) {
        try {
            return data.toDate().toISOString();
        } catch {
            return String(data);
        }
    }

    // Handle Firestore DocumentReference / CollectionReference
    // These contain references to the Firestore instance ('db'), which is circular.
    if (data && data.path && typeof data.path === 'string' && (data._firestore || data.firestore)) {
        return data.path;
    }

    // Handle Arrays
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }

    // Handle Plain Objects
    // Only recurse if it's a plain object to avoid walking class instances (Firestore, Auth, etc.)
    if (Object.getPrototypeOf(data) === Object.prototype || data.constructor.name === 'Object') {
        const sanitized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitized[key] = sanitizeData(data[key]);
            }
        }
        return sanitized;
    }

    // Fallback for unknown complex objects: convert to string to break circularity
    return String(data);
};

function App() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [activePane, setActivePane] = useState<Pane>('dashboard');
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPoToDelete] = useState<string | string[] | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [ordersFilter, setOrdersFilter] = useState<{
      status?: OverallPOStatus;
      fulfillmentStatus?: FulfillmentStatus;
      isOilStuck?: boolean;
      partNumber?: string;
      hasAnyShortage?: boolean;
  } | null>(null);

  const [suggestionItem, setSuggestionItem] = useState<POItem | null>(null);
  const [suggestion, setSuggestion] = useState<ProcurementSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    statuses: [] as string[],
    customer: '',
    startDate: '',
    endDate: '',
    mainBranches: [] as string[],
    subBranches: [] as string[],
    categories: [] as string[],
    customerCategories: [] as string[],
    zones: [] as string[],
  });

  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  
  // Keep selectedPO in sync with the latest data from purchaseOrders
  useEffect(() => {
    if (selectedPO) {
      const updated = purchaseOrders.find(p => p.id === selectedPO.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPO)) {
        setSelectedPO(updated);
      }
    }
  }, [purchaseOrders, selectedPO]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    signInAnonymously(auth).catch(err => {
        console.warn("Auth check failed:", err.message);
    });

    const handleError = (error: any) => {
        if (error.code === 'permission-denied') {
            setFirestoreError('Database permission denied. Authentication required.');
        }
    };
    
    const unsubPO = onSnapshot(query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc")), (snapshot) => {
        const pos = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as PurchaseOrder);
        setPurchaseOrders(pos);
    }, handleError);

    const unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc")), (snapshot) => {
        const logsData = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as LogEntry);
        setLogs(logsData);
    }, handleError);

    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const notifs = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as Notification);
        setNotifications(notifs);
    }, handleError);

    return () => {
        unsubPO(); unsubLogs(); unsubNotifs();
    };
}, [theme]);

  const addLog = async (poId: string, action: string) => {
    await addDoc(collection(db, "logs"), { poId, action, timestamp: serverTimestamp() });
  };

  const handleUpdatePO = useCallback(async (updatedPO: PurchaseOrder) => {
    // Sanitize data before sending to Firestore just in case
    const cleanPO = sanitizeData(updatedPO);
    const poRef = doc(db, "purchaseOrders", cleanPO.id);
    await updateDoc(poRef, { ...cleanPO });
    addLog(cleanPO.id, "PO updated.");
  }, []);

  const handleDeletePO = useCallback(async (poId: string | string[]) => {
    setPoToDelete(poId);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDeletePO = async () => {
    if (!poToDelete) return;
    try {
        const batch = writeBatch(db);
        const idsToDelete = Array.isArray(poToDelete) ? poToDelete : [poToDelete];
        
        for (const id of idsToDelete) {
            batch.delete(doc(db, "purchaseOrders", id));
            
            // Also delete logs associated with this PO
            const logsQuery = query(collection(db, "logs"), where("poId", "==", id));
            const logsSnapshot = await getDocs(logsQuery);
            logsSnapshot.forEach((logDoc) => {
                batch.delete(logDoc.ref);
            });
        }
        
        await batch.commit();
        setIsDeleteModalOpen(false);
        setPoToDelete(null);
    } catch (error) {
        console.error("Error deleting PO(s):", error);
        alert("Failed to delete Purchase Order(s).");
    }
  };

  const handleGetSuggestion = async (item: POItem) => {
    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestionItem(item);
    setActiveModal('suggestion');
    try {
      const result = await getProcurementSuggestion(item);
      setSuggestion(result);
    } catch (err) {
      setSuggestionError("Failed to fetch procurement strategy from Gemini.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleUpdateItemStatus = async (poId: string, partNumber: string, status: POItemStatus) => {
      const targetPO = purchaseOrders.find(po => po.id === poId);
      if (!targetPO) return;

      const newItems = targetPO.items.map(item => {
          if (item.partNumber === partNumber) {
              return { ...item, status };
          }
          return item;
      });

      await handleUpdatePO({ ...targetPO, items: newItems });
      addLog(poId, `Status for item ${partNumber} updated to ${status}.`);
  };

  const handleSaveSingleOrder = async (order: any) => {
      try {
          const poData = sanitizeData({
              poNumber: order.poNo,
              salesOrderNumber: order.soNo,
              poDate: order.poDate,
              customerName: order.accountName,
              mainBranch: order.mainBranch,
              subBranch: order.subBranch,
              items: order.items.map((i: any) => ({
                  ...i,
                  status: i.status || (i.stockStatus === 'Available' ? POItemStatus.Available : POItemStatus.NotAvailable)
              })),
              saleType: order.saleType,
              creditTerms: order.creditTerms,
              status: order.poStatus || OverallPOStatus.Available,
              materials: order.materials,
              fulfillmentStatus: order.materials,
              orderStatus: order.orderStatus || OrderStatus.OpenOrders,
              billingAddress: order.billingAddress,
              billToGSTIN: order.billToGSTIN,
              shippingAddress: order.shippingAddress,
              shipToGSTIN: order.shipToGSTIN,
              quoteNumber: order.quoteNumber,
              pfAvailable: order.pfAvailable,
              checklist: order.checklist,
              checklistRemarks: order.checklistRemarks,
              dispatchRemarks: order.dispatchRemarks,
              generalRemarks: order.generalRemarks,
              etaAvailable: order.etaAvailable,
              billingPlan: order.billingPlan,
              invoiceNumber: order.invoiceNumber,
              invoiceDate: order.invoiceDate,
              customerCategory: order.customerCategory,
              zone: order.zone,
              createdAt: new Date().toISOString(),
              paymentStatus: (order.saleType === 'Cash' || order.saleType === 'Awaiting Payment') ? 'Pending' : null,
              paymentNotes: '',
          });
          await addDoc(collection(db, "purchaseOrders"), poData);
          alert("Order saved successfully.");
      } catch (e) {
          console.error("Error saving order:", e);
          alert("Error saving order.");
      }
  };

  const handleBulkUpload = async (parsedOrders: any[]) => {
      const batch = writeBatch(db);
      try {
          for (const order of parsedOrders) {
              const newRef = doc(collection(db, "purchaseOrders"));
              batch.set(newRef, sanitizeData({
                  ...order,
                  createdAt: new Date().toISOString(),
                  paymentNotes: '',
              }));
          }
          await batch.commit();
          alert(`Successfully uploaded ${parsedOrders.length} orders.`);
          setActivePane('dashboard');
      } catch (e) {
          console.error("Bulk upload batch error:", e);
          alert("Failed to process bulk upload.");
      }
  };

  const handleSelectPO = useCallback((po: PurchaseOrder) => {
    setSelectedPO(po);
    setActiveModal('poDetail');
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal('none');
    setSelectedPO(null);
    setSuggestionItem(null);
    setSuggestion(null);
  }, []);

  const handleDashboardCardClick = useCallback((type: string, payload?: any) => {
    if (type === 'OPEN') setOrdersFilter({ isInvoiced: false });
    else if (type === 'FULLY_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.Available, isInvoiced: false });
    else if (type === 'PARTIALLY_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.PartiallyAvailable, isInvoiced: false });
    else if (type === 'NOT_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.NotAvailable, isInvoiced: false });
    else if (type === 'ANY_SHORTAGE') setOrdersFilter({ hasAnyShortage: true, isInvoiced: false });
    else if (type === 'OIL_STUCK') setOrdersFilter({ isOilStuck: true, isInvoiced: false });
    else if (type === 'PART_SHORTAGE') setOrdersFilter({ partNumber: payload, isInvoiced: false });
    else if (type === 'INVOICED') setOrdersFilter({ isInvoiced: true });
    else setOrdersFilter(null);
    setActivePane('allOrders');
  }, []);

  const uniqueCustomers = useMemo(() => {
    const names = new Set(purchaseOrders.map(po => po.customerName).filter(Boolean));
    return Array.from(names).sort();
  }, [purchaseOrders]);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
       {firestoreError && <ErrorBanner projectId="ethenpo-3afb3" message={firestoreError} onDismiss={() => setFirestoreError(null)} />}
      <Sidebar activePane={activePane} setActivePane={setActivePane} />
       <div className="flex-1 flex flex-col">
        <Header notifications={notifications} onMarkNotificationsAsRead={() => {}} theme={theme} setTheme={setTheme} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {activePane === 'dashboard' && <Dashboard purchaseOrders={purchaseOrders} filters={filters} setFilters={setFilters} customers={uniqueCustomers} onCardClick={handleDashboardCardClick} />}
            {activePane === 'allOrders' && (
                <AllOrdersPane 
                    purchaseOrders={purchaseOrders} 
                    onSelectPO={handleSelectPO} 
                    onDeletePO={handleDeletePO} 
                    filter={ordersFilter} 
                    onClearFilter={() => setOrdersFilter(null)} 
                    selectedCategories={filters.categories}
                    dashboardFilters={filters}
                    setDashboardFilters={setFilters}
                />
            )}
            {activePane === 'upload' && <UploadPane onSaveSingleOrder={handleSaveSingleOrder} onBulkUpload={handleBulkUpload} />}
            {activePane === 'analysis' && <AnalysisPane purchaseOrders={purchaseOrders} onSelectPO={handleSelectPO} />}
            {activePane === 'topCustomers' && <TopCustomersPane purchaseOrders={purchaseOrders} />}
            {activePane === 'reports' && <ReportsPane purchaseOrders={purchaseOrders} onUpdatePO={handleUpdatePO} />}
            {activePane === 'dataManagement' && <DataManagementPane purchaseOrders={purchaseOrders} />}
        </main>
      </div>
      
       {selectedPO && (
        <POModal
          isOpen={activeModal === 'poDetail'}
          onClose={handleCloseModal}
          existingPO={selectedPO}
          logs={logs.filter(log => log.poId === selectedPO.id)}
          onUpdate={handleUpdatePO}
          onGetSuggestion={handleGetSuggestion}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
       )}

       <ProcurementSuggestionModal 
          isOpen={activeModal === 'suggestion'}
          onClose={() => setActiveModal('none')}
          item={suggestionItem}
          suggestion={suggestion}
          isLoading={suggestionLoading}
          error={suggestionError}
       />

       <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeletePO}
          title={Array.isArray(poToDelete) ? "Delete Multiple Purchase Orders" : "Delete Purchase Order"}
       >
          {Array.isArray(poToDelete) 
            ? `Are you sure you want to delete ${poToDelete.length} selected Purchase Orders? This action cannot be undone and will also remove all associated activity logs.`
            : "Are you sure you want to delete this Purchase Order? This action cannot be undone and will also remove all associated activity logs."
          }
       </ConfirmationModal>
    </div>
  );
}

export default App;
