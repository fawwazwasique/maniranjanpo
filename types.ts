
export enum POItemStatus {
  Available = 'Available',
  PartiallyAvailable = 'Partially Available',
  NotAvailable = 'Not Available',
  Dispatched = 'Dispatched',
}

export enum OverallPOStatus {
    Open = 'Open',
    PartiallyDispatched = 'Partially Dispatched',
    Fulfilled = 'Fulfilled',
    Cancelled = 'Cancelled'
}

export enum OrderStatus {
  OpenOrders = 'Open Orders',
  PartiallyInvoiced = 'Partially Invoiced',
  Invoiced = 'Invoiced',
  ShippedInSystemDC = 'Shipped in System DC',
  Cancelled = 'Cancelled'
}

export enum FulfillmentStatus {
  New = 'New',
  Partial = 'Partial',
  Fulfillment = 'Fulfillment',
  NotAvailable = 'Not Available',
  Release = 'Release',
  Invoiced = 'Invoiced',
  Shipped = 'Shipped',
}

export interface POItem {
  partNumber: string;
  quantity: number;
  rate: number;
  status: POItemStatus;
  itemDesc?: string;
  discount?: number;
  gst?: number;
  stockAvailable?: number;
  stockInHand?: number;
  allocatedQuantity?: number;
  deliveryQuantity?: number;
  invoicedQuantity?: number;
  stockStatus?: 'Available' | 'Unavailable';
  oaDate?: string;
  oaNo?: string;
  itemType?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  customerName: string;
  poDate: string;
  items: POItem[];
  status: OverallPOStatus;
  createdAt: string;
  saleType: 'Cash' | 'Credit';
  paymentStatus: 'Received' | 'Pending' | null;
  paymentNotes: string;
  creditTerms: number;
  mainBranch?: string;
  subBranch?: string;
  salesOrderNumber?: string;
  systemRemarks?: string;
  orderStatus?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  soDate?: string;
  invoiceDate?: string;
  invoiceNumber?: string;
  pfAvailable?: boolean;
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
  billingAddress?: string;
  billToGSTIN?: string;
  shippingAddress?: string;
  shipToGSTIN?: string;
  quoteNumber?: string;
  dispatchRemarks?: string;
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
  referenceId?: string; // PO ID or Invoice Number
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
