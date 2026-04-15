
import { PurchaseOrder, BranchStock, POItemStatus, FulfillmentStatus, OrderStatus } from '../types';

/**
 * Automatically maps Purchase Order items against available branch stock.
 * Updates POItemStatus and Overall PO Fulfillment Status.
 */
export const mapPOToStock = (po: PurchaseOrder, branchStock: BranchStock[]): PurchaseOrder => {
  if (po.orderStatus === OrderStatus.Invoiced || po.orderStatus === OrderStatus.Cancelled) {
    return po;
  }

  const branch = po.mainBranch;
  if (!branch) return po;

  const relevantStock = branchStock.filter(s => s.branch === branch);
  
  let allAvailable = true;
  let noneAvailable = true;

  const updatedItems = po.items.map(item => {
    const stock = relevantStock.find(s => s.partNumber.toLowerCase() === item.partNumber.toLowerCase());
    const availableQty = stock ? stock.quantity : 0;

    let status = POItemStatus.NotAvailable;
    if (availableQty >= item.quantity) {
      status = POItemStatus.Available;
      noneAvailable = false;
    } else if (availableQty > 0) {
      status = POItemStatus.PartiallyAvailable;
      allAvailable = false;
      noneAvailable = false;
    } else {
      allAvailable = false;
    }

    return {
      ...item,
      status,
      stockAvailable: availableQty
    };
  });

  let fulfillmentStatus = FulfillmentStatus.NotAvailable;
  if (allAvailable) fulfillmentStatus = FulfillmentStatus.Available;
  else if (!noneAvailable) fulfillmentStatus = FulfillmentStatus.PartiallyAvailable;

  return {
    ...po,
    items: updatedItems,
    fulfillmentStatus
  };
};

/**
 * Calculates stock deduction for an invoiced PO.
 */
export const getStockDeductions = (po: PurchaseOrder): { partNumber: string, branch: string, quantity: number }[] => {
  if (!po.mainBranch) return [];
  
  return po.items.map(item => ({
    partNumber: item.partNumber,
    branch: po.mainBranch!,
    quantity: item.quantity
  }));
};
