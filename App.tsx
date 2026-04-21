
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import POModal from './components/POModal';
import ProcurementSuggestionModal from './components/ProcurementSuggestionModal';
import Sidebar from './components/Sidebar';
import UploadPane from './components/UploadPane';
import ConfirmationModal from './components/ConfirmationModal';
import AllOrdersPane from './components/AllOrdersPane';
import TopCustomersPane from './components/TopCustomersPane';
import DataManagementPane from './components/DataManagementPane';
import ReportsPane from './components/ReportsPane';
import DetailedBreakdownPane from './components/DetailedBreakdownPane';
import ErrorBanner from './components/ErrorBanner';
import WelcomeScreen from './components/WelcomeScreen';
import { ExclamationTriangleIcon, ArrowUpTrayIcon } from './components/icons';
import useLocalStorage from './hooks/useLocalStorage';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, setDoc, limit } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { getProcurementSuggestion } from './services/geminiService';
import { performMonthlyInvoicedCleanup } from './utils/cleanupUtils';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion } from './types';
import { POItemStatus, OverallPOStatus, OrderStatus, FulfillmentStatus } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type ModalType = 'none' | 'poDetail' | 'suggestion';
type Pane = 'dashboard' | 'upload' | 'allOrders' | 'dataManagement' | 'reports' | 'topCustomers' | 'detailedBreakdown';
type ThemeMode = 'light' | 'dark';
type ThemeColor = 'classic' | 'emerald' | 'midnight' | 'sunset' | 'ocean';

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

  // Cleanup logic on mount
  useEffect(() => {
    performMonthlyInvoicedCleanup();
  }, []);

  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [activePane, setActivePane] = useState<Pane>('dashboard');
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('themeMode', 'light');
  const [themeColor, setThemeColor] = useLocalStorage<ThemeColor>('themeColor', 'classic');
  const [showWelcome, setShowWelcome] = useState(true);

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPoToDelete] = useState<string | string[] | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [ordersFilter, setOrdersFilter] = useState<{
      status?: OverallPOStatus;
      fulfillmentStatus?: FulfillmentStatus;
      partNumber?: string;
      hasAnyShortage?: boolean;
      isInvoiced?: boolean;
      isPartiallyInvoiced?: boolean;
      showGapOnly?: boolean;
      saleType?: string;
      category?: string;
      blockingType?: 'OIL_ONLY' | 'PARTS_ONLY' | 'BOTH';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLimit, setDataLimit] = useState(2000);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

  const loadMore = useCallback(() => {
    setDataLimit(prev => prev + 500);
  }, []);

  const loadAll = useCallback(() => {
    setDataLimit(10000);
  }, []);
  
  const fetchLogsAndNotifs = async () => {
    try {
        const logsSnap = await getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(30)));
        const logsData = logsSnap.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as LogEntry);
        setLogs(logsData);

        const notifsSnap = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30)));
        const notifsData = notifsSnap.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as Notification);
        setNotifications(notifsData);
    } catch (error: any) {
        if (error.code === 'resource-exhausted') {
            setFirestoreError('Firestore Quota Exceeded. Some data might be stale.');
        }
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    setFirestoreError(null);
    try {
        const poSnap = await getDocs(query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"), limit(dataLimit)));
        const pos = poSnap.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as PurchaseOrder);
        setPurchaseOrders(pos);
        await fetchLogsAndNotifs();
    } catch (error: any) {
        if (error.code === 'resource-exhausted') {
            setFirestoreError('Firestore Quota Exceeded. Could not refresh data.');
        } else {
            handleFirestoreError(error, OperationType.GET, "refresh");
        }
    } finally {
        setIsRefreshing(false);
    }
  };

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
    root.classList.remove('light', 'dark');
    root.classList.add(themeMode);
    root.setAttribute('data-theme', themeColor);
  }, [themeMode, themeColor]);

  useEffect(() => {
    signInAnonymously(auth).catch(err => {
        console.warn("Auth check failed:", err.message);
        if (err.code === 'auth/configuration-not-found') {
            setFirestoreError('Firebase Auth is not enabled for this project. Please enable "Anonymous" sign-in in your Firebase Console.');
        } else if (err.code === 'auth/network-request-failed') {
            setFirestoreError('Network error: Could not connect to Firebase. Please check your internet connection.');
        }
    });

    const handleError = (error: any) => {
        if (error.code === 'permission-denied') {
            setFirestoreError('Database permission denied. Authentication required.');
        }
    };
    
    const unsubPO = onSnapshot(query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"), limit(dataLimit)), (snapshot) => {
        const pos = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as PurchaseOrder);
        setPurchaseOrders(pos);
    }, (error) => {
        if (error.code === 'resource-exhausted') {
            setFirestoreError('Firestore Quota Exceeded. The daily free limit for database reads/writes has been reached. The app will resume once the quota resets (usually at midnight).');
        } else {
            handleFirestoreError(error, OperationType.GET, "purchaseOrders");
        }
    });

    fetchLogsAndNotifs();

    return () => {
        unsubPO();
    };
}, [dataLimit]);

  const addLog = async (poId: string, action: string) => {
    try {
      await addDoc(collection(db, "logs"), { poId, action, timestamp: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "logs");
    }
  };

  const handleUpdatePO = useCallback(async (updatedPO: PurchaseOrder) => {
    try {
      // Calculate total value for the PO
      const totalValue = (updatedPO.items || []).reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
      
      // Sanitize data before sending to Firestore just in case
      const cleanPO = sanitizeData({ ...updatedPO, totalValue });
      const poRef = doc(db, "purchaseOrders", cleanPO.id);
      await updateDoc(poRef, { ...cleanPO });
      addLog(cleanPO.id, "PO updated.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "purchaseOrders");
    }
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
            const logsSnapshot = await getDocs(logsQuery).catch(error => handleFirestoreError(error, OperationType.GET, "logs"));
            if (logsSnapshot) {
                logsSnapshot.forEach((logDoc) => {
                    batch.delete(logDoc.ref);
                });
            }
        }
        
        await batch.commit().catch(error => handleFirestoreError(error, OperationType.WRITE, "bulk delete"));
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
          const totalValue = (order.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
          
          const poData = sanitizeData({
              ...order,
              totalValue,
              createdAt: new Date().toISOString(),
              paymentStatus: (order.saleType === 'Cash' || order.saleType === 'Awaiting Payment') ? 'Pending' : null,
          });
          await addDoc(collection(db, "purchaseOrders"), poData);
          alert("Order saved successfully.");
      } catch (e) {
          console.error("Error saving order:", e);
          handleFirestoreError(e, OperationType.CREATE, "purchaseOrders");
      }
  };

  const handleBulkUpload = async (parsedOrders: any[]) => {
      console.log(`Starting bulk upload of ${parsedOrders.length} orders.`);
      setUploadProgress({ current: 0, total: parsedOrders.length });
      try {
          const batchSize = 100; // Smaller batches for better progress visibility and safety
          let totalUploaded = 0;
          
          for (let i = 0; i < parsedOrders.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = parsedOrders.slice(i, i + batchSize);
              
              for (const order of chunk) {
                  const newRef = doc(collection(db, "purchaseOrders"));
                  // Calculate total value for the PO to store it at top level
                  const totalValue = (order.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
                  
                  const sanitized = sanitizeData({
                      ...order,
                      totalValue,
                      createdAt: new Date().toISOString(),
                  });
                  batch.set(newRef, sanitized);
              }
              
              await batch.commit();
              totalUploaded += chunk.length;
              setUploadProgress({ current: totalUploaded, total: parsedOrders.length });
              console.log(`Committed batch. Total uploaded: ${totalUploaded}`);
          }
          
          alert(`Successfully uploaded ${parsedOrders.length} orders.`);
          setActivePane('dashboard');
      } catch (e: any) {
          console.error("Bulk upload error:", e);
          if (e.code === 'resource-exhausted') {
              setFirestoreError('Bulk upload partially failed due to Firestore Quota limits. Some orders may not have been uploaded.');
          } else {
              handleFirestoreError(e, OperationType.WRITE, "purchaseOrders bulk upload");
          }
      } finally {
          setUploadProgress(null);
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

  const handleDashboardCardClick = useCallback((type: string, payload?: any, category?: string) => {
    if (type === 'OPEN') setOrdersFilter({ isInvoiced: false, category });
    else if (type === 'FULLY_AVAILABLE') {
        setOrdersFilter({ 
            fulfillmentStatus: FulfillmentStatus.Available, 
            isInvoiced: false,
            saleType: payload,
            category
        });
    }
    else if (type === 'PARTIALLY_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.PartiallyAvailable, isInvoiced: false, category });
    else if (type === 'NOT_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.NotAvailable, isInvoiced: false, category });
    else if (type === 'ANY_SHORTAGE') setOrdersFilter({ hasAnyShortage: true, isInvoiced: false, category });
    else if (type === 'PART_SHORTAGE') setOrdersFilter({ partNumber: payload, isInvoiced: false, category });
    else if (type === 'PARTIAL_INVOICED') setOrdersFilter({ isPartiallyInvoiced: true, category });
    else if (type === 'INVOICED') setOrdersFilter({ isInvoiced: true, category });
    else if (type === 'GAP') setOrdersFilter({ showGapOnly: true, isInvoiced: false, category });
    else if (type === 'SALE_TYPE') setOrdersFilter({ saleType: payload, isInvoiced: false, category });
    else if (type === 'OIL_ONLY_BLOCKED') setOrdersFilter({ blockingType: 'OIL_ONLY', isInvoiced: false, category });
    else if (type === 'PARTS_ONLY_BLOCKED') setOrdersFilter({ blockingType: 'PARTS_ONLY', isInvoiced: false, category });
    else if (type === 'BOTH_BLOCKED') setOrdersFilter({ blockingType: 'BOTH', isInvoiced: false, category });
    else setOrdersFilter(category ? { category } : null);
    setActivePane('allOrders');
  }, []);

  const uniqueCustomers = useMemo(() => {
    const names = new Set(purchaseOrders.map(po => po.customerName).filter(Boolean));
    return Array.from(names).sort();
  }, [purchaseOrders]);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
       {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} />}
      {firestoreError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 text-red-800 dark:text-red-200 p-4 rounded-xl shadow-2xl flex items-start gap-4 backdrop-blur-md">
            <div className="p-2 bg-red-500 rounded-lg text-white shrink-0">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg">System Alert</h3>
              <p className="text-sm font-medium opacity-90">{firestoreError}</p>
              <div className="mt-3 flex gap-3">
                <button 
                  onClick={() => setFirestoreError(null)}
                  className="text-xs font-bold uppercase tracking-wider bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Dismiss
                </button>
                <button 
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="text-xs font-bold uppercase tracking-wider bg-white dark:bg-slate-800 text-red-600 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50"
                >
                  {isRefreshing ? 'Refreshing...' : 'Try Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="mb-6 relative">
              <div className="w-24 h-24 border-4 border-slate-100 dark:border-slate-700 rounded-full mx-auto flex items-center justify-center">
                <ArrowUpTrayIcon className="w-10 h-10 text-red-600 animate-bounce" />
              </div>
              <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-red-500"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - uploadProgress.current / uploadProgress.total)}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Uploading Orders</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
              Processing {uploadProgress.current} of {uploadProgress.total} records...
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-red-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Please do not close this window</p>
          </div>
        </div>
      )}

      <Sidebar 
        activePane={activePane} 
        setActivePane={setActivePane} 
        themeColor={themeColor}
        setThemeColor={setThemeColor}
      />
       <div className="flex-1 flex flex-col">
        <Header 
            notifications={notifications} 
            onMarkNotificationsAsRead={() => {}} 
            theme={themeMode} 
            setTheme={setThemeMode} 
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {activePane === 'dashboard' && (
                <Dashboard 
                    purchaseOrders={purchaseOrders} 
                    filters={filters} 
                    setFilters={setFilters} 
                    customers={uniqueCustomers} 
                    onCardClick={handleDashboardCardClick} 
                    onRefresh={refreshData}
                    isRefreshing={isRefreshing}
                    dataLimit={dataLimit}
                    onLoadMore={loadMore}
                    onLoadAll={loadAll}
                />
            )}
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
                    onRefresh={refreshData}
                    isRefreshing={isRefreshing}
                    onLoadMore={loadMore}
                    hasMore={purchaseOrders.length >= dataLimit}
                    dataLimit={dataLimit}
                    onLoadAll={loadAll}
                />
            )}
            {activePane === 'upload' && <UploadPane onSaveSingleOrder={handleSaveSingleOrder} onBulkUpload={handleBulkUpload} />}
            {activePane === 'topCustomers' && <TopCustomersPane purchaseOrders={purchaseOrders} />}
            {activePane === 'detailedBreakdown' && (
                <DetailedBreakdownPane 
                    purchaseOrders={purchaseOrders} 
                    onSelectPO={handleSelectPO} 
                />
            )}
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
          filterItems={ordersFilter?.showGapOnly}
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
