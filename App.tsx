
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
import { db, auth } from './services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch, query, where, getDocs, serverTimestamp, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { getProcurementSuggestion } from './services/geminiService';

import type { PurchaseOrder, Notification, LogEntry, POItem, ProcurementSuggestion } from './types';
import { POItemStatus, OverallPOStatus, OrderStatus, FulfillmentStatus } from './types';

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
  
  // New state for cross-pane filtering (from Dashboard to All Orders)
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
    // Attempt anonymous sign-in to satisfy "request.auth != null" rules.
    signInAnonymously(auth).catch(err => {
        const code = err.code;
        if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
            console.warn("Firebase Anonymous Auth is not enabled in the Console. If your Firestore Rules require auth, enable 'Anonymous' in Build > Authentication > Sign-in method.");
        } else {
            console.error("Anonymous auth failed:", err.message);
        }
    });

    const handleError = (error: any) => {
        // Safe error logging to prevent circular reference errors with Firestore objects
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Firestore error:", errorMessage);
        
        if (error.code === 'permission-denied') {
            setFirestoreError(
                'Database permission denied. To fix this:\n' +
                '1. Go to Firebase Console > Authentication > Sign-in method and enable "Anonymous".\n' +
                '2. OR Go to Firestore Database > Rules and change them to "allow read, write: if true;" (Public Test Mode).'
            );
        } else if (error.code === 'unavailable') {
             setFirestoreError('Firestore is offline or unreachable. Check your internet connection.');
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
            let createdAtStr = new Date().toISOString();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtStr = data.createdAt.toDate().toISOString();
            } else if (data.createdAt) {
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
      // Map user selection to enum
      let orderStatusValue: OrderStatus;
      switch (orderData.orderStatus) {
          case 'Open Orders': orderStatusValue = OrderStatus.OpenOrders; break;
          case 'Partially Invoiced': orderStatusValue = OrderStatus.PartiallyInvoiced; break;
          case 'Invoiced': orderStatusValue = OrderStatus.Invoiced; break;
          case 'Shipped in System DC': orderStatusValue = OrderStatus.ShippedInSystemDC; break;
          case 'Cancelled': orderStatusValue = OrderStatus.Cancelled; break;
          case 'Pending': orderStatusValue = OrderStatus.OpenOrders; break; 
          default: orderStatusValue = OrderStatus.OpenOrders;
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
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Error deleting PO:", errorMessage);
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

      // New Fulfillment Status Logic based on Item Availability
      let newFulfillmentStatus = poToUpdate.fulfillmentStatus;
      if (newItems.length > 0) {
          const isAvailable = (s: POItemStatus) => s === POItemStatus.Available || s === POItemStatus.Dispatched;
          
          const allItemsAvailable = newItems.every(i => isAvailable(i.status));
          const allItemsNotAvailable = newItems.every(i => i.status === POItemStatus.NotAvailable);
          
          if (allItemsAvailable) {
              newFulfillmentStatus = FulfillmentStatus.Fulfillment; // Maps to "Fully Available"
          } else if (allItemsNotAvailable) {
              newFulfillmentStatus = FulfillmentStatus.NotAvailable;
          } else {
              newFulfillmentStatus = FulfillmentStatus.Partial;
          }
      }

      const poRef = doc(db, "purchaseOrders", poId);
      await updateDoc(poRef, {
        items: newItems,
        status: newOverallStatus,
        fulfillmentStatus: newFulfillmentStatus,
      });

      if (selectedPO?.id === poId) {
          setSelectedPO({ ...poToUpdate, items: newItems, status: newOverallStatus, fulfillmentStatus: newFulfillmentStatus });
      }
      
      await addLog(poId, `Item ${partNumber} status updated to ${status}. Fulfillment Status updated to ${newFulfillmentStatus}.`);
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
  
  const handleDashboardCardClick = (filterType: string) => {
      // Mapping dashboard card clicks to filters for All Orders pane
      if (filterType === 'OPEN') {
          setOrdersFilter({ status: OverallPOStatus.Open });
      } else if (filterType === 'FULLY_AVAILABLE') {
          setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.Fulfillment });
      } else if (filterType === 'PARTIALLY_AVAILABLE') {
          setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.Partial });
      } else if (filterType === 'NOT_AVAILABLE') {
          setOrdersFilter({ fulfillmentStatus: FulfillmentStatus.NotAvailable });
      } else {
          setOrdersFilter(null);
      }
      setActivePane('allOrders');
  };

  const handleBulkUpload = useCallback(async (files: File[]) => {
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
                        // Strip outer quotes and unescape double quotes
                        let val = current.trim();
                        if (val.startsWith('"') && val.endsWith('"')) {
                            val = val.slice(1, -1);
                        }
                        val = val.replace(/""/g, '"');
                        result.push(val);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                // Push last col
                let val = current.trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1);
                }
                val = val.replace(/""/g, '"');
                result.push(val);
                return result;
            };

            const dataLines = lines.slice(1); // Skip header, keep lines to check content
            
            // Group rows by PO Number (index 3 based on new template)
            const groupedByOrder: Record<string, string[]> = {};

            dataLines.forEach(line => {
                if (!line.trim()) return; // Skip completely empty lines
                
                const cols = parseLine(line);
                // Flexible check: if row is practically empty (just commas), skip
                if (cols.every(c => !c || c.trim() === '')) return;

                // Index 3 is PO Number.
                // If PO number is present, use it to group.
                // If NOT present, generate a unique ID so it creates a distinct draft PO.
                const poNum = cols[3]?.trim();
                const key = poNum ? poNum : `DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                if (!groupedByOrder[key]) groupedByOrder[key] = [];
                groupedByOrder[key].push(line);
            });

            // 1. PREPARE ALL OPERATIONS
            // We collect all write operations into a single array first to avoid loop state issues
            const allOperations: { ref: any, data: any }[] = [];

            for (const key in groupedByOrder) {
                const groupLines = groupedByOrder[key];
                if (groupLines.length === 0) continue;

                const firstRowCols = parseLine(groupLines[0]);
                const getCol = (idx: number) => firstRowCols[idx] ? firstRowCols[idx].trim() : '';
                
                // Flexible boolean parser: accepts TRUE, YES, 1, Y (case insensitive)
                const getBool = (idx: number) => {
                    const val = (firstRowCols[idx] || '').trim().toUpperCase();
                    return val === 'TRUE' || val === 'YES' || val === '1' || val === 'Y';
                };

                const items: POItem[] = groupLines.map(line => {
                    const c = parseLine(line);
                    const getC = (idx: number) => c[idx] ? c[idx].trim() : '';
                    
                    // Parse item status column (New Index: 20)
                    let itemStatusVal = POItemStatus.NotAvailable;
                    const statusStr = getC(20).toLowerCase();
                    if (statusStr.includes('partially')) itemStatusVal = POItemStatus.PartiallyAvailable;
                    else if (statusStr.includes('not')) itemStatusVal = POItemStatus.NotAvailable;
                    else if (statusStr.includes('available')) itemStatusVal = POItemStatus.Available;
                    else if (statusStr.includes('dispatched')) itemStatusVal = POItemStatus.Dispatched;

                    return {
                        partNumber: getC(12) || '',
                        itemType: getC(13) || '',
                        itemDesc: getC(14) || '',
                        quantity: parseFloat(getC(15)) || 0,
                        rate: parseFloat(getC(16)) || 0,
                        discount: parseFloat(getC(17)) || 0,
                        gst: parseFloat(getC(18)) || 0,
                        stockStatus: (getC(19) as 'Available' | 'Unavailable') || 'Unavailable',
                        status: itemStatusVal,
                        
                        // Shifted indices due to insertion of Item Status at 20
                        oaNo: getC(21) || '',
                        oaDate: getC(22) || '',
                        
                        // Defaults
                        stockAvailable: 0,
                        stockInHand: 0,
                        allocatedQuantity: 0,
                        deliveryQuantity: 0,
                        invoicedQuantity: 0
                    };
                });
                
                const poRef = doc(collection(db, "purchaseOrders"));
                
                // Map Order Status from string to Enum
                let orderStatusVal: OrderStatus = OrderStatus.OpenOrders;
                const csvOrderStatus = getCol(25); // Shifted from 24
                if (csvOrderStatus === 'Invoiced') orderStatusVal = OrderStatus.Invoiced;
                else if (csvOrderStatus === 'Partially Invoiced') orderStatusVal = OrderStatus.PartiallyInvoiced;
                else if (csvOrderStatus === 'Cancelled') orderStatusVal = OrderStatus.Cancelled;
                else if (csvOrderStatus === 'Shipped in System DC') orderStatusVal = OrderStatus.ShippedInSystemDC;
                else if (csvOrderStatus === 'Open Orders') orderStatusVal = OrderStatus.OpenOrders;

                // Map Fulfillment Status (Handle friendly names from Single Upload UI)
                let fulfillmentStatusVal: FulfillmentStatus = FulfillmentStatus.New;
                const csvFulfillment = getCol(26); // Shifted from 25
                const normFulfillment = csvFulfillment?.trim();
                
                if (normFulfillment === 'Fully Available' || normFulfillment === 'Fulfillment') {
                    fulfillmentStatusVal = FulfillmentStatus.Fulfillment;
                } else if (normFulfillment === 'Partially Available' || normFulfillment === 'Partial') {
                    fulfillmentStatusVal = FulfillmentStatus.Partial;
                } else if (normFulfillment === 'Not Available') {
                    fulfillmentStatusVal = FulfillmentStatus.NotAvailable;
                } else if (normFulfillment === 'Shipped') {
                     fulfillmentStatusVal = FulfillmentStatus.Shipped;
                } else if (normFulfillment === 'Release') {
                     fulfillmentStatusVal = FulfillmentStatus.Release;
                } else if (normFulfillment === 'Invoiced') {
                     fulfillmentStatusVal = FulfillmentStatus.Invoiced;
                } else if (normFulfillment === 'New') {
                    fulfillmentStatusVal = FulfillmentStatus.New;
                }

                const poData = {
                    id: poRef.id,
                    mainBranch: getCol(0),
                    subBranch: getCol(1),
                    customerName: getCol(2) || 'Unknown Customer',
                    poNumber: getCol(3) || key,
                    poDate: getCol(4) || new Date().toISOString().split('T')[0],
                    salesOrderNumber: getCol(5),
                    soDate: getCol(6) || new Date().toISOString().split('T')[0],
                    quoteNumber: getCol(7),
                    billingAddress: getCol(8),
                    billToGSTIN: getCol(9),
                    shippingAddress: getCol(10),
                    shipToGSTIN: getCol(11),
                    items: items, 
                    
                    // Shifted indices
                    saleType: (getCol(23) as 'Cash' | 'Credit') || 'Credit', // Shifted from 22
                    creditTerms: parseInt(getCol(24)) || 30, // Shifted from 23
                    orderStatus: orderStatusVal,
                    fulfillmentStatus: fulfillmentStatusVal,
                    
                    pfAvailable: getBool(27), // Shifted from 26
                    checklist: {
                        bCheck: getBool(28), // Shifted from 27
                        cCheck: getBool(29),
                        dCheck: getBool(30),
                        battery: getBool(31),
                        spares: getBool(32),
                        bd: getBool(33),
                        radiatorDescaling: getBool(34),
                        others: getBool(35)
                    },
                    checklistRemarks: getCol(36), // Shifted from 35

                    status: OverallPOStatus.Open,
                    paymentStatus: null,
                    paymentNotes: 'Imported via Bulk Upload',
                    systemRemarks: '',
                    createdAt: serverTimestamp(),
                };

                // Add PO Write Operation
                allOperations.push({ ref: poRef, data: poData });
                
                // Add Log Write Operation
                const logRef = doc(collection(db, "logs"));
                allOperations.push({ 
                    ref: logRef, 
                    data: {
                        poId: poRef.id,
                        action: `PO #${poData.poNumber} created from bulk upload (${file.name}).`,
                        timestamp: serverTimestamp(),
                    } 
                });
                
                // Add Notification Write Operation
                const notifRef = doc(collection(db, "notifications"));
                allOperations.push({ 
                    ref: notifRef, 
                    data: {
                        poId: poRef.id,
                        message: `New PO ${poData.poNumber} created via bulk upload.`,
                        read: false,
                        createdAt: serverTimestamp(),
                    }
                });
            }

            // 2. EXECUTE BATCHES
            const BATCH_SIZE = 450; 

            for (let k = 0; k < allOperations.length; k += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = allOperations.slice(k, k + BATCH_SIZE);
                
                chunk.forEach(op => {
                    batch.set(op.ref, op.data);
                });
                
                await batch.commit();
            }

            totalProcessed++;

        } catch (err) {
            // Fix: Safe error logging to prevent circular reference errors
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("Error processing file", file.name, errorMessage);
            alert(`Error processing file ${file.name}: ${errorMessage}`);
        }
    }
    
    if (totalProcessed > 0) {
        alert(`${totalProcessed} file(s) processed successfully. Incomplete records saved as drafts.`);
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
                    onCardClick={handleDashboardCardClick}
                />
            )}
             {activePane === 'allOrders' && (
                 <AllOrdersPane
                    purchaseOrders={purchaseOrders}
                    onSelectPO={handleSelectPO}
                    onDeletePO={handleDeletePO}
                    filter={ordersFilter}
                    onClearFilter={() => setOrdersFilter(null)}
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
