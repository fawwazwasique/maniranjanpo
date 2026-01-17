
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
import DataManagementPane from './components/DataManagementPane';
import ReportsPane from './components/ReportsPane';
import StockManagementPane from './components/StockManagementPane';
import ErrorBanner from './components/ErrorBanner';
import useLocalStorage from './hooks/useLocalStorage';
import { db, auth } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { getProcurementSuggestion } from './services/geminiService';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion, StockItem, StockMovement } from './types';
import { POItemStatus, OverallPOStatus, OrderStatus, FulfillmentStatus } from './types';

type ModalType = 'none' | 'poDetail' | 'suggestion';
type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement' | 'reports' | 'stockManagement';
type Theme = 'light' | 'dark';

function App() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [activePane, setActivePane] = useState<Pane>('dashboard');
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  const [ordersFilter, setOrdersFilter] = useState<{
      status?: OverallPOStatus;
      fulfillmentStatus?: FulfillmentStatus;
  } | null>(null);

  const [suggestionItem, setSuggestionItem] = useState<POItem | null>(null);
  const [suggestion, setSuggestion] = useState<ProcurementSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    date: '',
    mainBranch: '',
    subBranch: '',
  });

  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  
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
        const pos = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseOrder));
        setPurchaseOrders(pos);
    }, handleError);

    const unsubStock = onSnapshot(collection(db, "stock"), (snapshot) => {
        const stocks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockItem));
        setStock(stocks);
    }, handleError);

    const unsubMovements = onSnapshot(query(collection(db, "stockMovements"), orderBy("timestamp", "desc")), (snapshot) => {
        const mvts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockMovement));
        setStockMovements(mvts);
    }, handleError);

    const unsubLogs = onSnapshot(query(collection(db, "logs"), orderBy("timestamp", "desc")), (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LogEntry));
        setLogs(logsData);
    }, handleError);

    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc")), (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
        setNotifications(notifs);
    }, handleError);

    return () => {
        unsubPO(); unsubStock(); unsubMovements(); unsubLogs(); unsubNotifs();
    };
}, [theme]);

  const addLog = async (poId: string, action: string) => {
    await addDoc(collection(db, "logs"), { poId, action, timestamp: serverTimestamp() });
  };

  const logStockMovement = async (mvt: Omit<StockMovement, 'id' | 'timestamp'>) => {
    await addDoc(collection(db, "stockMovements"), { ...mvt, timestamp: serverTimestamp() });
  };

  const handleUpdatePO = useCallback(async (updatedPO: PurchaseOrder) => {
    const poRef = doc(db, "purchaseOrders", updatedPO.id);
    await updateDoc(poRef, { ...updatedPO });
    addLog(updatedPO.id, "PO updated.");
  }, []);

  const handleRegisterPart = async (partNumber: string, description: string, initialQty: number) => {
      const stockRef = doc(db, "stock", partNumber);
      await setDoc(stockRef, {
          partNumber: partNumber,
          description: description,
          totalQuantity: initialQty,
          allocatedQuantity: 0,
          updatedAt: serverTimestamp()
      }, { merge: true });

      if (initialQty > 0) {
          await logStockMovement({
              partNumber: partNumber,
              type: 'INWARD',
              quantity: initialQty,
              remarks: 'Initial stock registration'
          });
      }
  };

  const handleBulkStockUpload = async (items: { partNumber: string; description: string; quantity: number }[]) => {
      const batch = writeBatch(db);
      for (const item of items) {
          const stockRef = doc(db, "stock", item.partNumber);
          batch.set(stockRef, {
              partNumber: item.partNumber,
              description: item.description,
              totalQuantity: item.quantity,
              allocatedQuantity: 0,
              updatedAt: serverTimestamp()
          }, { merge: true });
      }
      await batch.commit();

      for (const item of items) {
          if (item.quantity > 0) {
              await logStockMovement({
                  partNumber: item.partNumber,
                  type: 'INWARD',
                  quantity: item.quantity,
                  remarks: 'Bulk inward upload'
              });
          }
      }
  };

  const handleInwardStock = async (partNumber: string, qty: number, remark: string) => {
    const stockRef = doc(db, "stock", partNumber);
    const existing = stock.find(s => s.partNumber === partNumber);
    const newTotal = (existing?.totalQuantity || 0) + qty;
    
    await setDoc(stockRef, {
        partNumber: partNumber,
        description: existing?.description || 'Inward Entry',
        totalQuantity: newTotal,
        allocatedQuantity: existing?.allocatedQuantity || 0,
        updatedAt: serverTimestamp()
    }, { merge: true });

    await logStockMovement({
        partNumber: partNumber,
        type: 'INWARD',
        quantity: qty,
        remarks: `Inward: ${remark}`
    });
  };

  const handleWalkingSale = async (partNumber: string, qty: number, remark: string) => {
    const stockRef = doc(db, "stock", partNumber);
    const existing = stock.find(s => s.partNumber === partNumber);
    if (!existing || (existing.totalQuantity - existing.allocatedQuantity) < qty) {
        alert("Insufficient available stock for walking sale.");
        return;
    }
    
    const newTotal = existing.totalQuantity - qty;
    await updateDoc(stockRef, { totalQuantity: newTotal, updatedAt: serverTimestamp() });

    await logStockMovement({
        partNumber: partNumber,
        type: 'OUTWARD_WALKING',
        quantity: qty,
        remarks: `Walking Sale: ${remark}`
    });
  };

  const handleAllocateStock = async (poId: string, partNumber: string, qty: number) => {
    const targetPo = purchaseOrders.find(p => p.id === poId);
    const targetStock = stock.find(s => s.partNumber === partNumber);

    if (!targetPo || !targetStock) return;
    if ((targetStock.totalQuantity - targetStock.allocatedQuantity) < qty) {
        alert("Insufficient physical stock to allocate.");
        return;
    }

    const batch = writeBatch(db);

    const newItems = targetPo.items.map(item => {
        if (item.partNumber === partNumber) {
            return { ...item, allocatedQuantity: (item.allocatedQuantity || 0) + qty };
        }
        return item;
    });

    batch.update(doc(db, "purchaseOrders", poId), { items: newItems });
    batch.update(doc(db, "stock", partNumber), { 
        allocatedQuantity: (targetStock.allocatedQuantity || 0) + qty,
        updatedAt: serverTimestamp()
    });

    await batch.commit();
    await logStockMovement({
        partNumber: partNumber,
        type: 'ALLOCATION',
        quantity: qty,
        referenceId: poId,
        remarks: `Allocated to PO #${targetPo.poNumber}`
    });
    addLog(poId, `Allocated ${qty} units of ${partNumber} from stock.`);
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
          const poData = {
              poNumber: order.poNo,
              salesOrderNumber: order.soNo,
              poDate: order.poDate,
              customerName: order.accountName,
              mainBranch: order.mainBranch,
              subBranch: order.subBranch,
              items: order.items.map((i: any) => ({
                  ...i,
                  status: i.stockStatus === 'Available' ? POItemStatus.Available : POItemStatus.NotAvailable
              })),
              saleType: order.saleType,
              creditTerms: order.creditTerms,
              status: OverallPOStatus.Open,
              fulfillmentStatus: order.fulfillmentStatus === 'Fully Available' ? FulfillmentStatus.Fulfillment : FulfillmentStatus.Partial,
              orderStatus: order.orderStatus,
              billingAddress: order.billingAddress,
              billToGSTIN: order.billToGSTIN,
              shippingAddress: order.shippingAddress,
              shipToGSTIN: order.shipToGSTIN,
              quoteNumber: order.quoteNumber,
              pfAvailable: order.pfAvailable,
              checklist: order.checklist,
              checklistRemarks: order.checklistRemarks,
              createdAt: new Date().toISOString(),
              paymentStatus: order.saleType === 'Cash' ? 'Pending' : null,
              paymentNotes: '',
          };
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
              batch.set(newRef, {
                  ...order,
                  createdAt: new Date().toISOString(),
                  paymentNotes: '',
              });
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

  const handleDashboardCardClick = useCallback((type: string) => {
    if (type === 'OPEN') setOrdersFilter({ status: OverallPOStatus.Open });
    else if (type === 'FULLY_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.Fulfillment });
    else if (type === 'PARTIALLY_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.Partial });
    else if (type === 'NOT_AVAILABLE') setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.NotAvailable });
    setActivePane('allOrders');
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
       {firestoreError && <ErrorBanner projectId="ethen-power-po" message={firestoreError} onDismiss={() => setFirestoreError(null)} />}
      <Sidebar activePane={activePane} setActivePane={setActivePane} />
       <div className="flex-1 flex flex-col">
        <Header notifications={notifications} onMarkNotificationsAsRead={() => {}} theme={theme} setTheme={setTheme} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {activePane === 'dashboard' && <Dashboard purchaseOrders={purchaseOrders} filters={filters} setFilters={setFilters} customers={[]} onCardClick={handleDashboardCardClick} />}
            {activePane === 'allOrders' && <AllOrdersPane purchaseOrders={purchaseOrders} onSelectPO={handleSelectPO} onDeletePO={() => {}} filter={ordersFilter} onClearFilter={() => setOrdersFilter(null)} />}
            {activePane === 'stockManagement' && (
                <StockManagementPane 
                    stock={stock} 
                    purchaseOrders={purchaseOrders} 
                    movements={stockMovements}
                    onInward={handleInwardStock}
                    onWalkingSale={handleWalkingSale}
                    onAllocate={handleAllocateStock}
                    onRegisterPart={handleRegisterPart}
                    onBulkStockUpload={handleBulkStockUpload}
                    onNavigateToReports={() => setActivePane('reports')}
                />
            )}
            {activePane === 'upload' && <UploadPane onSaveSingleOrder={handleSaveSingleOrder} onBulkUpload={handleBulkUpload} />}
            {activePane === 'analysis' && <AnalysisPane purchaseOrders={purchaseOrders} onSelectPO={handleSelectPO} />}
            {activePane === 'reports' && <ReportsPane purchaseOrders={purchaseOrders} onUpdatePO={handleUpdatePO} />}
            {activePane === 'dataManagement' && <DataManagementPane purchaseOrders={purchaseOrders} stock={stock} stockMovements={stockMovements} />}
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
    </div>
  );
}

export default App;
