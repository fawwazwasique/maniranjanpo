
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

export const isOilItem = (item: any) => {
    const text = ` ${(item.partNumber || '')} ${(item.itemDesc || '')} ${(item.category || '')} `.toLowerCase();
    
    // Common brands/terms
    if (text.includes('valvoline') || text.includes('mobil') || 
        text.includes('shell') || text.includes('castrol') || 
        text.includes('lubricant') || text.includes('engine oil') || 
        text.includes('gear oil') || text.includes('coolant')) return true;
    
    // Broad "oil" check but try to avoid "coil"
    if (text.includes('oil')) {
        if (text.includes('coil') || text.includes('soil')) {
            return /\boil\b/i.test(text);
        }
        return true;
    }
    return false;
};

export const isOilStuckPO = (po: PurchaseOrder) => {
    // Signal 1: Explicit status
    if (po.status === OverallPOStatus.OilRequired) return true;

    // Signal 2: Item-level analysis
    const oilItems = po.items.filter(isOilItem);
    const nonOilItems = po.items.filter(i => !isOilItem(i));
    
    if (oilItems.length === 0) return false;

    const hasUnavailableOil = oilItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);
    const hasUnavailableNonOil = nonOilItems.some(i => i.status === POItemStatus.NotAvailable || i.status === POItemStatus.PartiallyAvailable);

    // Stuck ONLY due to Oil
    return hasUnavailableOil && !hasUnavailableNonOil;
};
