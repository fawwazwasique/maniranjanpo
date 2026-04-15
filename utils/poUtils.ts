
import { PurchaseOrder, POItemStatus, OverallPOStatus, FulfillmentStatus } from '../types';

export const getPOFulfillmentStatus = (po: PurchaseOrder, selectedCategories: string[] = []) => {
    const items = po.items || [];
    
    // If we have items, always calculate dynamically to respect category filters
    if (items.length > 0) {
        const relevantItems = items.filter(item => 
            selectedCategories.length === 0 || selectedCategories.includes(item.category)
        );
        
        if (relevantItems.length === 0) {
            // If no items match the selected categories, we can't say it's ready/partial/not available for those categories
            // However, for dashboard counts, we usually want to know if the PO is "Ready" overall if no categories selected
            // If categories ARE selected and none match, this PO shouldn't even be in the filtered list usually.
            return FulfillmentStatus.NotAvailable;
        }

        const fullyAvailableCount = relevantItems.filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
        const notAvailableCount = relevantItems.filter(i => i.status === POItemStatus.NotAvailable).length;
        
        if (fullyAvailableCount === relevantItems.length) return FulfillmentStatus.Available;
        if (notAvailableCount === relevantItems.length) return FulfillmentStatus.NotAvailable;
        return FulfillmentStatus.PartiallyAvailable;
    }

    // Fallback to static bucket only if no items are present
    if (po.fulfillmentBucket) {
        if (po.fulfillmentBucket === 'Ready to Execute') return FulfillmentStatus.Available;
        if (po.fulfillmentBucket === 'Partially Available') return FulfillmentStatus.PartiallyAvailable;
        if (po.fulfillmentBucket === '100% Not Available') return FulfillmentStatus.NotAvailable;
    }

    return FulfillmentStatus.NotAvailable;
};

export const getPOValue = (po: PurchaseOrder, selectedCategories: string[] = []) => {
    const relevantItems = (po.items || []).filter(item => 
        selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );
    return relevantItems.reduce((itemAcc, item) => itemAcc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
};
