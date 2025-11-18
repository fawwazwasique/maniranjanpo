
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
import ErrorBanner from './components/ErrorBanner';
import useLocalStorage from './hooks/useLocalStorage';
import { db } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';

import { getProcurementSuggestion } from './services/geminiService';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion, OrderStatus, FulfillmentStatus } from './types';
import { POItemStatus, OverallPOStatus } from './types';

type ModalType = 'none' | 'poDetail' | 'suggestion';
type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders';
type Theme = 'light' | 'dark';

function App() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [activePane, setActivePane] = useState<Pane>('dashboard');
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
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

  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });
  
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handleError = (error: any) => {
        console.error("Firestore error:", error);
        if (error.code === 'permission-denied') {
            setFirestoreError(
                'The application could not connect to the database due to missing or insufficient permissions. ' +
                'This is likely caused by your Firestore Security Rules.'
            );
        }
    };
    
    const qPO = query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"));
    const unsubPO = onSnapshot(qPO, (querySnapshot) => {
        setFirestoreError(null);
        const posFromDB: PurchaseOrder[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Defensively clean the items array to ensure they are plain objects
            const cleanItems: POItem[] = (data.items || []).map((item: any) => ({
                partNumber: item.partNumber || '',
                quantity: Number(item.quantity) || 0,
                rate: Number(item.rate) || 0,
                status: item.status || POItemStatus.NotAvailable,
                itemDesc: item.itemDesc || '',
                discount: Number(item.discount) || 0,
                gst: Number(item.gst) || 0,
                stockAvailable: Number(item.stockAvailable) || 0,
                stockInHand: Number(item.stockInHand) || 0,
                allocatedQuantity: Number(item.allocatedQuantity) || 0,
                deliveryQuantity: Number(item.deliveryQuantity) || 0,
                invoicedQuantity: Number(item.invoicedQuantity) || 0,
                stockStatus: item.stockStatus,
                oaDate: item.oaDate,
                oaNo: item.oaNo,
            }));

            // Manually construct a plain JavaScript object to avoid circular references
            // from Firestore's internal object structure.
            posFromDB.push({
                id: doc.id,
                poNumber: data.poNumber,
                customerName: data.customerName,
                poDate: (data.poDate instanceof Timestamp) ? data.poDate.toDate().toISOString().split('T')[0] : data.poDate,
                items: cleanItems,
                status: data.status,
                createdAt: (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt,
                saleType: data.saleType,
                paymentStatus: data.paymentStatus,
                paymentNotes: data.paymentNotes,
                creditTerms: data.creditTerms,
                mainBranch: data.mainBranch,
                subBranch: data.subBranch,
                salesOrderNumber: data.salesOrderNumber,
                systemRemarks: data.systemRemarks,
                orderStatus: data.orderStatus,
                fulfillmentStatus: data.fulfillmentStatus,
                soDate: data.soDate,
                invoiceDate: data.invoiceDate,
                pfAvailable: data.pfAvailable,
                checklist: data.checklist,
                checklistRemarks: data.checklistRemarks,
            });
        });
        setPurchaseOrders(posFromDB);
    }, handleError);

    const qLogs = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(qLogs, (querySnapshot) => {
        const logsFromDB: LogEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            logsFromDB.push({
                id: doc.id,
                action: data.action,
                poId: data.poId,
                timestamp: (data.timestamp instanceof Timestamp) ? data.timestamp.toDate().toISOString() : data.timestamp,
            });
        });
        setLogs(logsFromDB);
    }, handleError);

    const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubNotifs = onSnapshot(qNotifs, (querySnapshot) => {
        const notifsFromDB: Notification[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            notifsFromDB.push({
                id: doc.id,
                message: data.message,
                poId: data.poId,
                read: data.read,
                createdAt: (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt,
            });
        });
        setNotifications(notifsFromDB);
    }, handleError);

    return () => {
        unsubPO();
        unsubLogs();
        unsubNotifs();
    };
}, []);


  const allCustomers = useMemo(() => {
    const poCustomers = purchaseOrders.map(po => po.customerName);
    return [...new Set(poCustomers)];
  }, [purchaseOrders]);


  const addLog = async (poId: string, action: string) => {
    await addDoc(collection(db, "logs"), {
        poId,
        action,
        timestamp: serverTimestamp(),
    });
  };

  const addNotification = async (poId: string, message: string) => {
     await addDoc(collection(db, "notifications"), {
        poId,
        message,
        read: false,
        createdAt: serverTimestamp(),
    });
  };

  const handleSaveSingleOrder = useCallback(async (orderData: any) => {
      const { FulfillmentStatus, OrderStatus } = await import('./types');
      
      let orderStatusValue: OrderStatus;
      switch (orderData.orderStatus) {
          case 'Pending': orderStatusValue = OrderStatus.Draft; break;
          case 'Invoiced': orderStatusValue = OrderStatus.Invoiced; break;
          case 'Shipped': orderStatusValue = OrderStatus.Shipped; break;
          default: orderStatusValue = OrderStatus.Draft;
      }

      let fulfillmentStatusValue: FulfillmentStatus;
      switch (orderData.fulfillmentStatus) {
          case 'Fully Available': fulfillmentStatusValue = FulfillmentStatus.Fulfillment; break;
          case 'Partially Available': fulfillmentStatusValue = FulfillmentStatus.Partial; break;
          default: fulfillmentStatusValue = FulfillmentStatus.New;
      }

      const newPOData = {
        status: OverallPOStatus.Open,
        poNumber: orderData.poNo,
        customerName: orderData.accountName,
        poDate: orderData.poDate,
        items: orderData.items.map((item: any) => ({
            partNumber: item.partNumber,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
            status: POItemStatus.NotAvailable,
            itemDesc: item.itemDesc,
            discount: Number(item.discount) || 0,
            gst: Number(item.gst) || 0,
            stockAvailable: Number(item.stockAvailable) || 0,
            stockInHand: Number(item.stockInHand) || 0,
            allocatedQuantity: Number(item.allocatedQuantity) || 0,
            deliveryQuantity: Number(item.deliveryQuantity) || 0,
            invoicedQuantity: Number(item.invoicedQuantity) || 0,
            stockStatus: item.stockStatus,
            oaDate: item.oaDate || '',
            oaNo: item.oaNo || '',
        })),
        saleType: orderData.saleType,
        paymentStatus: orderData.saleType === 'Cash' ? 'Pending' : null,
        paymentNotes: '',
        creditTerms: Number(orderData.creditTerms) || 0,
        mainBranch: orderData.mainBranch,
        subBranch: orderData.subBranch,
        salesOrderNumber: orderData.soNo,
        systemRemarks: '',
        orderStatus: orderStatusValue,
        fulfillmentStatus: fulfillmentStatusValue,
        soDate: orderData.soDate,
        invoiceDate: orderData.invoiceDate,
        pfAvailable: orderData.pfAvailable,
        checklist: orderData.checklist,
        checklistRemarks: orderData.checklistRemarks || '',
      };
      
      const docRef = await addDoc(collection(db, "purchaseOrders"), {
          ...newPOData,
          createdAt: serverTimestamp()
      });
      
      await addLog(docRef.id, `PO #${newPOData.poNumber} created by Sales from form.`);
      await addNotification(docRef.id, `New PO ${newPOData.poNumber} received.`);
      alert(`Successfully created Sales Order for ${newPOData.customerName}.`);
  }, []);
  
  const handleUpdatePO = useCallback(async (updatedPO: PurchaseOrder) => {
    const poRef = doc(db, "purchaseOrders", updatedPO.id);
    
    const dataToUpdate = {
        poNumber: updatedPO.poNumber,
        customerName: updatedPO.customerName,
        poDate: updatedPO.poDate,
        items: updatedPO.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
            discount: Number(item.discount) || 0,
            gst: Number(item.gst) || 0,
            stockAvailable: Number(item.stockAvailable) || 0,
            stockInHand: Number(item.stockInHand) || 0,
            allocatedQuantity: Number(item.allocatedQuantity) || 0,
            deliveryQuantity: Number(item.deliveryQuantity) || 0,
            invoicedQuantity: Number(item.invoicedQuantity) || 0,
        })),
        status: updatedPO.status,
        saleType: updatedPO.saleType,
        paymentStatus: updatedPO.paymentStatus,
        paymentNotes: updatedPO.paymentNotes,
        creditTerms: Number(updatedPO.creditTerms) || 0,
        mainBranch: updatedPO.mainBranch,
        subBranch: updatedPO.subBranch,
        salesOrderNumber: updatedPO.salesOrderNumber,
        systemRemarks: updatedPO.systemRemarks,
        orderStatus: updatedPO.orderStatus,
        fulfillmentStatus: updatedPO.fulfillmentStatus,
        soDate: updatedPO.soDate,
        invoiceDate: updatedPO.invoiceDate,
        pfAvailable: updatedPO.pfAvailable,
        checklist: updatedPO.checklist,
        checklistRemarks: updatedPO.checklistRemarks,
    };

    await updateDoc(poRef, dataToUpdate);
    
    if (selectedPO?.id === updatedPO.id) {
        setSelectedPO(updatedPO);
    }
    addLog(updatedPO.id, "PO details were updated.");
    addNotification(updatedPO.id, `Details for PO #${updatedPO.poNumber} updated.`);
  }, [selectedPO]);

  const handleCloseConfirmation = () => {
    setConfirmationState({ isOpen: false, title: '', message: '' });
  };
  
  const handleDeletePO = useCallback((poId: string) => {
    const poToDelete = purchaseOrders.find(p => p.id === poId);
    if (!poToDelete) return;
    setConfirmationState({
        isOpen: true,
        title: 'Confirm Deletion',
        message: <>Are you sure you want to permanently delete PO <strong>{poToDelete.poNumber}</strong>? This will also remove all associated logs and notifications. This action cannot be undone.</>,
        onConfirm: async () => {
            try {
                const batch = writeBatch(db);
                // Delete the PO
                batch.delete(doc(db, "purchaseOrders", poId));
                // Find and delete associated logs
                const logsQuery = query(collection(db, "logs"), where("poId", "==", poId));
                const logsSnapshot = await getDocs(logsQuery);
                logsSnapshot.forEach(logDoc => batch.delete(logDoc.ref));
                // Find and delete associated notifications
                const notifsQuery = query(collection(db, "notifications"), where("poId", "==", poId));
                const notifsSnapshot = await getDocs(notifsQuery);
                notifsSnapshot.forEach(notifDoc => batch.delete(notifDoc.ref));
                
                await batch.commit();

                console.log(`Successfully deleted PO ${poId} and its related data.`);
            } catch (error) {
                console.error("Error deleting PO:", error);
                alert("Failed to delete the purchase order.");
            }
            handleCloseConfirmation();
        },
    });
  }, [purchaseOrders]);

  const executeUpdateItemStatus = useCallback(async (poId: string, partNumber: string, status: POItemStatus) => {
      const poToUpdate = purchaseOrders.find(p => p.id === poId);
      if (!poToUpdate) return;

      const newItems = poToUpdate.items.map(item => item.partNumber === partNumber ? { ...item, status } : item);
      
      const dispatchedCount = newItems.filter(i => i.status === POItemStatus.Dispatched).length;
      let newOverallStatus = poToUpdate.status;
      if (dispatchedCount === newItems.length) {
          newOverallStatus = OverallPOStatus.Fulfilled;
      } else if (dispatchedCount > 0) {
          newOverallStatus = OverallPOStatus.PartiallyDispatched;
      } else {
          newOverallStatus = OverallPOStatus.Open;
      }

      const poRef = doc(db, "purchaseOrders", poId);
      await updateDoc(poRef, {
        items: newItems,
        status: newOverallStatus,
      });

      if (selectedPO?.id === poId) {
          setSelectedPO({ ...poToUpdate, items: newItems, status: newOverallStatus });
      }
      
      await addLog(poId, `Item ${partNumber} status updated to ${status} by Stores.`);
      await addNotification(poId, `Status of ${partNumber} updated to ${status}.`);
      handleCloseConfirmation();
  }, [purchaseOrders, selectedPO]);

  const handleUpdateItemStatus = useCallback((poId: string, partNumber: string, status: POItemStatus) => {
    const po = purchaseOrders.find(p => p.id === poId);
    const item = po?.items.find(i => i.partNumber === partNumber);
    if (!po || !item) return;

    setConfirmationState({
        isOpen: true,
        title: 'Confirm Status Change',
        message: (
            <>
                Are you sure you want to change the status of part <strong>{partNumber}</strong> from "<strong>{item.status}</strong>" to "<strong>{status}</strong>"?
            </>
        ),
        onConfirm: () => executeUpdateItemStatus(poId, partNumber, status),
    });
  }, [purchaseOrders, executeUpdateItemStatus]);


  const handleMarkNotificationsAsRead = async () => {
    const batch = writeBatch(db);
    const unreadQuery = query(collection(db, "notifications"), where("read", "==", false));
    const querySnapshot = await getDocs(unreadQuery);
    querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  }

  const handleSelectPO = useCallback((po: PurchaseOrder) => {
    setSelectedPO(po);
    setActiveModal('poDetail');
  }, []);
  
  const handleGetSuggestion = async (item: POItem) => {
    setSuggestionItem(item);
    setActiveModal('suggestion');
    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestion(null);

    try {
        const result = await getProcurementSuggestion(item);
        if (result) {
            setSuggestion(result);
        } else {
            setSuggestionError("Failed to get suggestion. Please try again.");
        }
    } catch(err) {
        setSuggestionError("An error occurred while fetching the suggestion.");
    } finally {
        setSuggestionLoading(false);
    }
  };


  const handleCloseModal = () => {
    setActiveModal('none');
    setSelectedPO(null);
    setSuggestionItem(null);
  };
  
  const handleBulkUpload = useCallback(async (files: FileList) => {
    console.log("Uploading files:", files);
    const batch = writeBatch(db);
    const newPoNotifications: {id: string, poNumber: string}[] = [];

    Array.from(files).forEach((file, i) => {
        const newId = `PO-${Date.now() + i}`;
        const poNumber = `UPLOAD-${file.name.slice(0,10)}-${i}`;
        const newPOData = {
            id: newId,
            poNumber,
            customerName: `Customer ${i+1}`,
            poDate: new Date().toISOString().split('T')[0],
            items: [{ 
                partNumber: 'PN-BULK-001', 
                quantity: 10, 
                rate: 100, 
                status: POItemStatus.NotAvailable,
                itemDesc: 'Bulk uploaded item',
                discount: 0,
                gst: 18,
                stockAvailable: 100,
                stockInHand: 100,
                allocatedQuantity: 0,
                deliveryQuantity: 0,
                invoicedQuantity: 0,
            }],
            status: OverallPOStatus.Open,
            saleType: 'Credit' as 'Credit',
            creditTerms: 30,
            paymentStatus: null,
            paymentNotes: 'Bulk upload.',
            mainBranch: 'Bengaluru',
            subBranch: 'Peenya',
            salesOrderNumber: `SO-BULK-${i}`,
            systemRemarks: `Generated from ${file.name}`,
            orderStatus: "Draft" as OrderStatus,
            fulfillmentStatus: 'New' as FulfillmentStatus,
            createdAt: serverTimestamp()
        };
        const poRef = doc(collection(db, "purchaseOrders"));
        batch.set(poRef, newPOData);
        newPoNotifications.push({ id: poRef.id, poNumber: newPOData.poNumber });
    });

    await batch.commit();

    for (const po of newPoNotifications) {
        await addLog(po.id, `PO #${po.poNumber} created from bulk upload.`);
        await addNotification(po.id, `New PO ${po.poNumber} created via bulk upload.`);
    }

    alert(`${files.length} file(s) processed and POs have been added to Firestore.`);
    setActivePane('dashboard');
  }, []);


  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
       {firestoreError && (
        <ErrorBanner
          projectId="maniranjan-po-dashboard"
          message={firestoreError}
          onDismiss={() => setFirestoreError(null)}
        />
      )}
      <Sidebar activePane={activePane} setActivePane={setActivePane} />
       <div className="flex-1 flex flex-col">
        <Header
          notifications={notifications}
          onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
          theme={theme}
          setTheme={setTheme}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {purchaseOrders.length === 0 && activePane === 'dashboard' && !firestoreError && (
              <div className="text-center p-10">
                <h2 className="text-2xl font-semibold">No purchase orders found.</h2>
                <p className="text-base text-slate-500">Create a new order from the "Create & Upload" pane.</p>
              </div>
            )}
            {activePane === 'dashboard' && (
                 <Dashboard
                    purchaseOrders={purchaseOrders}
                    onSelectPO={handleSelectPO}
                    onDeletePO={handleDeletePO}
                    filters={filters}
                    setFilters={setFilters}
                    customers={allCustomers}
                />
            )}
             {activePane === 'allOrders' && (
                 <AllOrdersPane
                    purchaseOrders={purchaseOrders}
                    onSelectPO={handleSelectPO}
                    onDeletePO={handleDeletePO}
                />
            )}
            {activePane === 'upload' && (
                <UploadPane 
                    onSaveSingleOrder={handleSaveSingleOrder}
                    onBulkUpload={handleBulkUpload}
                />
            )}
            {activePane === 'analysis' && (
                <AnalysisPane purchaseOrders={purchaseOrders} />
            )}
        </main>
      </div>
      
       {selectedPO && (
        <POModal
          isOpen={activeModal === 'poDetail'}
          onClose={handleCloseModal}
          existingPO={selectedPO}
          logs={logs.filter(log => log.poId === selectedPO.id)}
          onUpdate={handleUpdatePO}
          onUpdateItemStatus={handleUpdateItemStatus}
          onGetSuggestion={handleGetSuggestion}
        />
       )}

       <ProcurementSuggestionModal 
         isOpen={activeModal === 'suggestion'}
         onClose={handleCloseModal}
         item={suggestionItem}
         suggestion={suggestion}
         isLoading={suggestionLoading}
         error={suggestionError}
       />

       <ConfirmationModal
         isOpen={confirmationState.isOpen}
         onClose={handleCloseConfirmation}
         onConfirm={confirmationState.onConfirm!}
         title={confirmationState.title}
       >
        {confirmationState.message}
       </ConfirmationModal>
    </div>
  );
}

export default App;