
export enum POItemStatus {
  Available = 'Available',
  PartiallyAvailable = 'Partially Available',
  NotAvailable = 'Not Available',
  Dispatched = 'Dispatched',
}

export enum OverallPOStatus {
    Amendment = 'Amendment',
    Available = 'Available',
    NotAvailable = 'Not Available',
    NeedToVisit = 'Need to visit',
    OilRequired = 'Oil Required',
    ServicePending = 'Service Pending',
    SuppliedThrough = 'Supplied through'
}

export enum OrderStatus {
  OpenOrders = 'Open Orders',
  PartiallyInvoiced = 'Partially Invoiced',
  Invoiced = 'Invoiced',
  ShippedInSystemDC = 'Shipped in System DC',
  Cancelled = 'Cancelled'
}

export enum FulfillmentStatus {
  Available = 'Available',
  NotAvailable = 'Not Available',
  PartiallyAvailable = 'Partially Available',
}

export interface POItem {
  partNumber: string; // Maps to Item: Item Name
  quantity: number;
  rate: number; // Maps to Unit Price
  status: POItemStatus;
  itemDesc?: string; // Maps to Item: Item Description
  discount?: number; // Maps to Discount Amount
  gst?: number; // Maps to Tax % (derived from Tax Amount if needed)
  stockAvailable?: number; // Maps to Stock Available
  stockInHand?: number; // Maps to Stock In Hand
  allocatedQuantity?: number;
  deliveryQuantity?: number;
  invoicedQuantity?: number;
  stockStatus?: 'Available' | 'Unavailable';
  oaDate?: string;
  oaNo?: string;
  itemType?: string; // Maps to Item: Item Type
  baseAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  category?: string;
  itemRemarks?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // Maps to PO.NO
  customerName: string; // Maps to Account Name
  poDate: string; // Maps to PO DATE
  items: POItem[];
  status: OverallPOStatus; // Maps to Po Status
  createdAt: string;
  saleType: 'Cash' | 'Credit';
  paymentStatus: 'Received' | 'Pending' | null;
  paymentNotes: string;
  creditTerms: number;
  mainBranch?: string; // Maps to Main -Branch
  subBranch?: string; // Maps to Sub - branch
  salesOrderNumber?: string; // Maps to SO.NO
  soDate?: string; // Maps to SO DATE
  generalRemarks?: string; // Maps to Remarks (Header)
  oaNo?: string;
  oaDate?: string;
  etaAvailable?: string; // Maps to Eta Available
  billingPlan?: string; // Maps to Billing Plan
  materials?: FulfillmentStatus; // Maps to Materials column
  quoteNumber?: string; // Maps to Quote Number
  billingAddress?: string;
  billToGSTIN?: string;
  shippingAddress?: string;
  shipToGSTIN?: string;
  orderStatus?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus; // Legacy reference kept for compatibility
  dispatchRemarks?: string;
  pfAvailable?: boolean;
  invoiceDate?: string;
  invoiceNumber?: string;
  systemRemarks?: string;
  checklist?: {
    bCheck: boolean;
    cCheck: boolean;
    dCheck: boolean;
    battery: boolean;
    spares: boolean;
    bd: boolean;
    radiatorDescaling: boolean;
    others: boolean;
  };
  checklistRemarks?: string;
}

export interface StockItem {
  id: string;
  partNumber: string;
  description: string;
  totalQuantity: number;
  allocatedQuantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  partNumber: string;
  type: 'INWARD' | 'OUTWARD_WALKING' | 'ALLOCATION' | 'TRANSFER' | 'DEALLOCATION';
  quantity: number;
  referenceId?: string;
  remarks: string;
  timestamp: string;
}

export interface QuotationItem {
  partNumber: string;
  quantity: number;
  rate: number;
}

export interface Quotation {
  id: string;
  customerName: string;
  validity: string;
  items: QuotationItem[];
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  poId: string;
  read: boolean;
  createdAt: string;
}

export interface LogEntry {
  id:string;
  timestamp: string;
  action: string;
  poId: string;
}

export interface ProcurementSuggestion {
    supplier_types: string[];
    negotiation_tactics: string[];
    lead_time_considerations: string[];
}
