
import { PurchaseOrder, POItemStatus, OverallPOStatus, FulfillmentStatus } from '../types';

export const getPOFulfillmentStatus = (po: PurchaseOrder, selectedCategories: string[]) => {
    if (po.fulfillmentBucket) {
        if (po.fulfillmentBucket === 'Ready to Execute') return FulfillmentStatus.Available;
        if (po.fulfillmentBucket === 'Partially Available') return FulfillmentStatus.PartiallyAvailable;
        if (po.fulfillmentBucket === '100% Not Available') return FulfillmentStatus.NotAvailable;
    }

    const relevantItems = (po.items || []).filter(item => 
        selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );
    
    if (relevantItems.length === 0) return FulfillmentStatus.NotAvailable;

    const fullyAvailableCount = relevantItems.filter(i => i.status === POItemStatus.Available || i.status === POItemStatus.Dispatched).length;
    const notAvailableCount = relevantItems.filter(i => i.status === POItemStatus.NotAvailable).length;
    
    if (fullyAvailableCount === relevantItems.length) return FulfillmentStatus.Available;
    if (notAvailableCount === relevantItems.length) return FulfillmentStatus.NotAvailable;
    return FulfillmentStatus.PartiallyAvailable;
};

export const getPOValue = (po: PurchaseOrder, selectedCategories: string[]) => {
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
