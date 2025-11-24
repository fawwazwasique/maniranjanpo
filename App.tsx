
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
import ErrorBanner from './components/ErrorBanner';
import useLocalStorage from './hooks/useLocalStorage';
import { db } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';

import { getProcurementSuggestion } from './services/geminiService';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion, OrderStatus, FulfillmentStatus } from './types';
import { POItemStatus, OverallPOStatus } from './types';

type ModalType = 'none' | 'poDetail' | 'suggestion';
type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement';
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
                itemType: item.itemType || '',
            }));

            // Manually construct a plain JavaScript object to avoid circular references
            // from Firestore's internal object structure.
            let createdAtStr = new Date().toISOString();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtStr = data.createdAt.toDate().toISOString();
            } else if (data.createdAt) {
                // Fallback if it's already a string or number, or pending FieldValue
                 createdAtStr = String(data.createdAt); 
            }

            posFromDB.push({
                id: doc.id,
                poNumber: data.poNumber,
                customerName: data.customerName,
                poDate: (data.poDate instanceof Timestamp) ? data.poDate.toDate().toISOString().split('T')[0] : data.poDate,
                items: cleanItems,
                status: data.status,
                createdAt: createdAtStr,
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
                invoiceNumber: data.invoiceNumber, 
                pfAvailable: data.pfAvailable,
                checklist: data.checklist,
                checklistRemarks: data.checklistRemarks,
                
                // New fields
                billingAddress: data.billingAddress || '',
                billToGSTIN: data.billToGSTIN || '',
                shippingAddress: data.shippingAddress || '',
                shipToGSTIN: data.shipToGSTIN || '',
                quoteNumber: data.quoteNumber || '',
            });
        });
        setPurchaseOrders(posFromDB);
    }, handleError);

    const qLogs = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(qLogs, (querySnapshot) => {
        const logsFromDB: LogEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let timestampStr = new Date().toISOString();
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                timestampStr = data.timestamp.toDate().toISOString();
            }

            logsFromDB.push({
                id: doc.id,
                action: data.action,
                poId: data.poId,
                timestamp: timestampStr,
            });
        });
        setLogs(logsFromDB);
    }, handleError);

    const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubNotifs = onSnapshot(qNotifs, (querySnapshot) => {
        const notifsFromDB: Notification[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let createdAtStr = new Date().toISOString();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtStr = data.createdAt.toDate().toISOString();
            }

            notifsFromDB.push({
                id: doc.id,
                message: data.message,
                poId: data.poId,
                read: data.read,
                createdAt: createdAtStr,
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
          case 'Not Available': fulfillmentStatusValue = FulfillmentStatus.NotAvailable; break;
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
            itemType: item.itemType || '',
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
        invoiceDate: null, 
        invoiceNumber: null, 
        pfAvailable: orderData.pfAvailable,
        checklist: orderData.checklist,
        checklistRemarks: orderData.checklistRemarks || '',
        billingAddress: orderData.billingAddress || '',
        billToGSTIN: orderData.billToGSTIN || '',
        shippingAddress: orderData.shippingAddress || '',
        shipToGSTIN: orderData.shipToGSTIN || '',
        quoteNumber: orderData.quoteNumber || '',
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
            itemType: item.itemType || '',
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
        invoiceNumber: updatedPO.invoiceNumber,
        pfAvailable: updatedPO.pfAvailable,
        checklist: updatedPO.checklist,
        checklistRemarks: updatedPO.checklistRemarks,
        billingAddress: updatedPO.billingAddress || '',
        billToGSTIN: updatedPO.billToGSTIN || '',
        shippingAddress: updatedPO.shippingAddress || '',
        shipToGSTIN: updatedPO.shipToGSTIN || '',
        quoteNumber: updatedPO.quoteNumber || '',
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
    let totalProcessed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            
            const parseLine = (line: string) => {
                const result = [];
                let current = '';
                let inQuote = false;
                for(let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if(char === '"') {
                        inQuote = !inQuote;
                    } else if(char === ',' && !inQuote) {
                        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                return result;
            };

            const dataLines = lines.slice(1).filter(l => l.trim().length > 0);
            
            // Group rows by PO Number (index 3 based on new template)
            const groupedByOrder: Record<string, string[]> = {};

            dataLines.forEach(line => {
                const cols = parseLine(line);
                if (cols.length < 5) return;
                // Index 3 is PO Number
                const key = cols[3] || `UNK-${Date.now()}-${Math.random()}`;
                if (!groupedByOrder[key]) groupedByOrder[key] = [];
                groupedByOrder[key].push(line);
            });

            const batch = writeBatch(db);
            let opCount = 0;

            for (const key in groupedByOrder) {
                const groupLines = groupedByOrder[key];
                if (groupLines.length === 0) continue;

                const firstRowCols = parseLine(groupLines[0]);
                const getCol = (idx: number) => firstRowCols[idx] || '';
                const getBool = (idx: number) => (firstRowCols[idx] || '').toUpperCase() === 'TRUE';

                const items: POItem[] = groupLines.map(line => {
                    const c = parseLine(line);
                    return {
                        partNumber: c[12] || 'Unknown Item', // Item Name
                        itemType: c[13] || '',
                        itemDesc: c[14] || '',
                        quantity: parseFloat(c[15]) || 0,
                        rate: parseFloat(c[16]) || 0,
                        discount: parseFloat(c[17]) || 0,
                        gst: parseFloat(c[18]) || 0,
                        stockStatus: (c[19] as 'Available' | 'Unavailable') || 'Unavailable',
                        oaNo: c[20] || '',
                        oaDate: c[21] || '',
                        
                        // Defaults for derived/internal logic
                        stockAvailable: 0,
                        stockInHand: 0,
                        status: POItemStatus.NotAvailable,
                        allocatedQuantity: 0,
                        deliveryQuantity: 0,
                        invoicedQuantity: 0
                    };
                });
                
                const poRef = doc(collection(db, "purchaseOrders"));
                const poData = {
                    id: poRef.id,
                    mainBranch: getCol(0),
                    subBranch: getCol(1),
                    customerName: getCol(2),
                    poNumber: getCol(3) || `PO-${Date.now()}`,
                    poDate: getCol(4) || new Date().toISOString().split('T')[0],
                    salesOrderNumber: getCol(5),
                    soDate: getCol(6) || new Date().toISOString().split('T')[0],
                    quoteNumber: getCol(7),
                    billingAddress: getCol(8),
                    billToGSTIN: getCol(9),
                    shippingAddress: getCol(10),
                    shipToGSTIN: getCol(11),
                    
                    saleType: (getCol(22) as 'Cash' | 'Credit') || 'Credit',
                    creditTerms: parseInt(getCol(23)) || 30,
                    orderStatus: (getCol(24) as OrderStatus) || "Draft",
                    fulfillmentStatus: (getCol(25) as FulfillmentStatus) || "New",
                    
                    pfAvailable: getBool(26),
                    checklist: {
                        bCheck: getBool(27),
                        cCheck: getBool(28),
                        dCheck: getBool(29),
                        others: getBool(30)
                    },
                    checklistRemarks: getCol(31),

                    status: OverallPOStatus.Open,
                    paymentStatus: null,
                    paymentNotes: 'Imported via Bulk Upload',
                    systemRemarks: '',
                    createdAt: serverTimestamp(),
                };

                batch.set(poRef, poData);
                opCount++;
                
                const logRef = doc(collection(db, "logs"));
                batch.set(logRef, {
                    poId: poRef.id,
                    action: `PO #${poData.poNumber} created from bulk upload (${file.name}).`,
                    timestamp: serverTimestamp(),
                });
                
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    poId: poRef.id,
                    message: `New PO ${poData.poNumber} created via bulk upload.`,
                    read: false,
                    createdAt: serverTimestamp(),
                });

                if (opCount >= 150) {
                     await batch.commit();
                     opCount = 0;
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }
            totalProcessed++;

        } catch (err) {
            console.error("Error processing file", file.name, err);
            alert(`Error processing file ${file.name}: ${err}`);
        }
    }
    
    if (totalProcessed > 0) {
        alert(`${totalProcessed} file(s) processed successfully.`);
        setActivePane('dashboard');
    }
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
             {activePane === 'dataManagement' && (
                <DataManagementPane purchaseOrders={purchaseOrders} />
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
