
import { PurchaseOrder, POItemStatus, OverallPOStatus } from '../types';

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
