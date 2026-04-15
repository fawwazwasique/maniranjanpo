
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
import DetailedBreakdownPane from './components/DetailedBreakdownPane';
import PrimaryPlanPane from './components/PrimaryPlanPane';
import StockManagementPane from './components/StockManagementPane';
import ErrorBanner from './components/ErrorBanner';
import WelcomeScreen from './components/WelcomeScreen';
import useLocalStorage from './hooks/useLocalStorage';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, setDoc, limit } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { getProcurementSuggestion } from './services/geminiService';
import { performMonthlyInvoicedCleanup } from './utils/cleanupUtils';
import { mapPOToStock, getStockDeductions } from './utils/stockUtils';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion, StockItem, StockMovement, BranchStock } from './types';
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
type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement' | 'reports' | 'topCustomers' | 'detailedBreakdown' | 'stockManagement';
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
  const [branchStock, setBranchStock] = useState<BranchStock[]>([]);
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
      isOilStuck?: boolean;
      partNumber?: string;
      hasAnyShortage?: boolean;
      isInvoiced?: boolean;
      isPartiallyInvoiced?: boolean;
      showGapOnly?: boolean;
      saleType?: string;
      category?: string;
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
    root.classList.remove('light', 'dark');
    root.classList.add(themeMode);
    root.setAttribute('data-theme', themeColor);
  }, [themeMode, themeColor]);

  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

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
    
    const unsubPO = onSnapshot(query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"), limit(200)), (snapshot) => {
        const pos = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as PurchaseOrder);
        setPurchaseOrders(pos);
    }, (error) => {
        if (error.code === 'resource-exhausted') setIsQuotaExceeded(true);
        handleFirestoreError(error, OperationType.GET, "purchaseOrders");
    });

    const unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(50)), (snapshot) => {
        const logsData = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as LogEntry);
        setLogs(logsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, "logs"));

    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
        const notifs = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as Notification);
        setNotifications(notifs);
    }, (error) => handleFirestoreError(error, OperationType.GET, "notifications"));

    const unsubBranchStock = onSnapshot(collection(db, "branchStock"), (snapshot) => {
        const stockData = snapshot.docs.map(doc => sanitizeData({ ...doc.data(), id: doc.id }) as BranchStock);
        setBranchStock(stockData);
    }, (error) => handleFirestoreError(error, OperationType.GET, "branchStock"));

    return () => {
        unsubPO(); unsubLogs(); unsubNotifs(); unsubBranchStock();
    };
}, []);

  const totalStockQty = useMemo(() => branchStock.reduce((acc, s) => acc + s.quantity, 0), [branchStock]);

  // Automated Stock Mapping Effect - Optimized with longer debounce and more stable trigger
  useEffect(() => {
    if (purchaseOrders.length === 0 || branchStock.length === 0 || isQuotaExceeded) return;

    const updateMapping = async () => {
      // Use a local copy to avoid closure issues with state
      const currentPOs = purchaseOrders;
      const currentStock = branchStock;
      
      const batch = writeBatch(db);
      let opsCount = 0;
      let hasChanges = false;

      for (const po of currentPOs) {
        // Only map open/partial orders
        if (po.orderStatus === OrderStatus.Invoiced || po.orderStatus === OrderStatus.Cancelled) continue;

        const mappedPO = mapPOToStock(po, currentStock);
        
        // Deep comparison to avoid unnecessary writes
        const itemsChanged = JSON.stringify(mappedPO.items) !== JSON.stringify(po.items);
        const statusChanged = mappedPO.fulfillmentStatus !== po.fulfillmentStatus;

        if (itemsChanged || statusChanged) {
          const poRef = doc(db, "purchaseOrders", po.id);
          batch.update(poRef, { 
            items: mappedPO.items, 
            fulfillmentStatus: mappedPO.fulfillmentStatus 
          });
          opsCount++;
          hasChanges = true;
          
          // Firestore batch limit is 500
          if (opsCount >= 450) break; 
        }
      }

      if (hasChanges) {
        await batch.commit().catch(err => {
          if (err.code === 'resource-exhausted') {
            console.error("Firestore Quota Exceeded. Auto-mapping paused.");
          } else {
            console.warn("Auto-mapping batch failed:", err);
          }
        });
      }
    };

    // Increased debounce to 10 seconds and only trigger on count/quantity changes
    const timer = setTimeout(updateMapping, 10000);
    return () => clearTimeout(timer);
  }, [branchStock.length, purchaseOrders.length, totalStockQty]); 

  // Safety Stock Alerts Effect - Optimized
  useEffect(() => {
    if (branchStock.length === 0 || isQuotaExceeded) return;

    const checkThresholds = async () => {
      const lowStockItems = branchStock.filter(s => s.minThreshold && s.quantity <= s.minThreshold);
      if (lowStockItems.length === 0) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      for (const item of lowStockItems) {
        // Check if notification already exists for this item today
        const alreadyNotified = notifications.some(n => 
          n.poId === 'STOCK_ALERT' &&
          n.message.includes(item.partNumber) && 
          n.message.includes(item.branch) && 
          n.createdAt.startsWith(today)
        );

        if (!alreadyNotified) {
          try {
            await addDoc(collection(db, "notifications"), {
              message: `⚠️ Low Stock Alert: ${item.partNumber} in ${item.branch} is at ${item.quantity} (Min: ${item.minThreshold})`,
              poId: 'STOCK_ALERT',
              read: false,
              createdAt: new Date().toISOString()
            });
          } catch (err: any) {
            if (err.code === 'resource-exhausted') break;
          }
        }
      }
    };

    // Run every 10 minutes or on count change, not on every stock update
    const timer = setTimeout(checkThresholds, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [branchStock.length, notifications.length]);

  const addLog = async (poId: string, action: string) => {
    try {
      await addDoc(collection(db, "logs"), { poId, action, timestamp: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "logs");
    }
  };

  const [isSyncingStock, setIsSyncingStock] = useState(false);

  const handleSyncStock = async () => {
    if (purchaseOrders.length === 0 || branchStock.length === 0) return;
    setIsSyncingStock(true);
    
    try {
      const batch = writeBatch(db);
      let hasChanges = false;
      let opsCount = 0;

      for (const po of purchaseOrders) {
        if (po.orderStatus === OrderStatus.Invoiced || po.orderStatus === OrderStatus.Cancelled) continue;
        const mappedPO = mapPOToStock(po, branchStock);
        
        if (JSON.stringify(mappedPO.items) !== JSON.stringify(po.items) || mappedPO.fulfillmentStatus !== po.fulfillmentStatus) {
          batch.update(doc(db, "purchaseOrders", po.id), { 
            items: mappedPO.items, 
            fulfillmentStatus: mappedPO.fulfillmentStatus 
          });
          hasChanges = true;
          opsCount++;
          if (opsCount >= 450) break;
        }
      }

      if (hasChanges) {
        await batch.commit();
        alert("Stock mapping synchronized successfully!");
      } else {
        alert("All orders are already up to date with current stock.");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Failed to sync stock mapping. Quota might be exceeded.");
    } finally {
      setIsSyncingStock(false);
    }
  };

  const handleUpdatePO = useCallback(async (updatedPO: PurchaseOrder) => {
    try {
      // Check if status changed to Invoiced to trigger stock deduction
      const oldPO = purchaseOrders.find(p => p.id === updatedPO.id);
      if (oldPO && oldPO.orderStatus !== OrderStatus.Invoiced && updatedPO.orderStatus === OrderStatus.Invoiced) {
        // Deduct stock
        const deductions = getStockDeductions(updatedPO);
        const batch = writeBatch(db);
        
        for (const d of deductions) {
          const stockItem = branchStock.find(s => s.partNumber.toLowerCase() === d.partNumber.toLowerCase() && s.branch === d.branch);
          if (stockItem) {
            const newQty = Math.max(0, stockItem.quantity - d.quantity);
            batch.update(doc(db, "branchStock", stockItem.id), {
              quantity: newQty,
              updatedAt: new Date().toISOString()
            });
            
            // Record movement
            const movementRef = doc(collection(db, "stockMovements"));
            batch.set(movementRef, {
              partNumber: d.partNumber,
              type: 'OUTWARD',
              quantity: d.quantity,
              branch: d.branch,
              timestamp: serverTimestamp(),
              remarks: `Auto-deduction for PO ${updatedPO.poNumber} (Invoiced)`
            });
          }
        }
        await batch.commit();
      }

      // Sanitize data before sending to Firestore just in case
      const cleanPO = sanitizeData(updatedPO);
      const poRef = doc(db, "purchaseOrders", cleanPO.id);
      await updateDoc(poRef, { ...cleanPO });
      addLog(cleanPO.id, "PO updated.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "purchaseOrders");
    }
  }, [purchaseOrders, branchStock]);

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
          const poData = sanitizeData({
              ...order,
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
      try {
          const batchSize = 400; // Safe margin below 500
          for (let i = 0; i < parsedOrders.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = parsedOrders.slice(i, i + batchSize);
              
              for (const order of chunk) {
                  const newRef = doc(collection(db, "purchaseOrders"));
                  batch.set(newRef, sanitizeData({
                      ...order,
                      createdAt: new Date().toISOString(),
                  }));
              }
              await batch.commit();
          }
          
          alert(`Successfully uploaded ${parsedOrders.length} orders.`);
          setActivePane('dashboard');
      } catch (e: any) {
          console.error("Bulk upload error:", e);
          handleFirestoreError(e, OperationType.WRITE, "purchaseOrders bulk upload");
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
    else if (type === 'OIL_STUCK') setOrdersFilter({ isOilStuck: true, isInvoiced: false, category });
    else if (type === 'PART_SHORTAGE') setOrdersFilter({ partNumber: payload, isInvoiced: false, category });
    else if (type === 'PARTIAL_INVOICED') setOrdersFilter({ isPartiallyInvoiced: true, category });
    else if (type === 'INVOICED') setOrdersFilter({ isInvoiced: true, category });
    else if (type === 'GAP') setOrdersFilter({ showGapOnly: true, isInvoiced: false, category });
    else if (type === 'SALE_TYPE') setOrdersFilter({ saleType: payload, isInvoiced: false, category });
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
       {isQuotaExceeded && (
         <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white p-2 text-center text-xs font-bold animate-pulse">
           ⚠️ FIRESTORE QUOTA EXCEEDED: Automated updates paused. Some data may be stale.
         </div>
       )}
       {firestoreError && <ErrorBanner projectId="ethenpodashboard" message={firestoreError} onDismiss={() => setFirestoreError(null)} />}
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
            {activePane === 'topCustomers' && <TopCustomersPane purchaseOrders={purchaseOrders} />}
            {activePane === 'detailedBreakdown' && (
                <DetailedBreakdownPane 
                    purchaseOrders={purchaseOrders} 
                    onSelectPO={handleSelectPO} 
                />
            )}
            {activePane === 'reports' && <ReportsPane purchaseOrders={purchaseOrders} onUpdatePO={handleUpdatePO} />}
            {activePane === 'stockManagement' && (
                <StockManagementPane 
                    branchStock={branchStock} 
                    onSyncStock={handleSyncStock}
                    isSyncing={isSyncingStock}
                />
            )}
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
