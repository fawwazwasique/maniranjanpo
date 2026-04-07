
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { OrderStatus, PurchaseOrder } from '../types';

/**
 * Automatically removes Invoiced POs from previous months.
 * This should be called once when the application initializes.
 */
export const performMonthlyInvoicedCleanup = async () => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const currentYear = now.getFullYear();

        // Query for all Invoiced POs
        const poRef = collection(db, "purchaseOrders");
        const q = query(poRef, where("orderStatus", "==", OrderStatus.Invoiced));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        let deleteCount = 0;

        snapshot.docs.forEach((document) => {
            const po = document.data() as PurchaseOrder;
            let shouldDelete = false;

            if (po.invoiceDate) {
                const invDate = new Date(po.invoiceDate);
                // If invoice date is valid and NOT in the current month/year
                if (!isNaN(invDate.getTime())) {
                    if (invDate.getMonth() !== currentMonth || invDate.getFullYear() !== currentYear) {
                        shouldDelete = true;
                    }
                }
            } else if (po.createdAt) {
                // Fallback to createdAt if invoiceDate is missing for some reason
                const createdDate = new Date(po.createdAt);
                if (!isNaN(createdDate.getTime())) {
                    if (createdDate.getMonth() !== currentMonth || createdDate.getFullYear() !== currentYear) {
                        shouldDelete = true;
                    }
                }
            }

            if (shouldDelete) {
                batch.delete(doc(db, "purchaseOrders", document.id));
                deleteCount++;
            }
        });

        if (deleteCount > 0) {
            await batch.commit();
            console.log(`Monthly cleanup: Removed ${deleteCount} invoiced POs from previous months.`);
        }
    } catch (error) {
        console.error("Error during monthly cleanup:", error);
    }
};
