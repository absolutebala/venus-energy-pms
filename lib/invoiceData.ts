// Shared invoice data store — used by both Invoices page and Project Detail
export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  workBoqRef: string;
  invoiceAmount: number;
  gst: number;
  totalAmount: number;
  invoiceStatus: string;
  paymentStatus: string;
  dueDate: string;
  projectId: string;
  poNo: string;
  createdAt: string;
}

export const SHARED_INVOICES: Invoice[] = [
  { id:'INV-001', invoiceNo:'INV-2025-0012', invoiceDate:'2025-05-20', workBoqRef:'BOQ-CIV-001', invoiceAmount:1250000, gst:225000, totalAmount:1475000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-06-19', projectId:'VE-2025-001', poNo:'PO-IND-2025-001', createdAt:'2025-05-20' },
  { id:'INV-002', invoiceNo:'INV-2025-0011', invoiceDate:'2025-05-15', workBoqRef:'BOQ-STR-002', invoiceAmount:1875000, gst:337500, totalAmount:2212500, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-06-14', projectId:'VE-2025-001', poNo:'PO-IND-2025-001', createdAt:'2025-05-15' },
  { id:'INV-003', invoiceNo:'INV-2025-0010', invoiceDate:'2025-05-10', workBoqRef:'BOQ-CIV-003', invoiceAmount:980000,  gst:176400, totalAmount:1156400, invoiceStatus:'Under Review', paymentStatus:'Pending', dueDate:'2025-06-09', projectId:'VE-2025-002', poNo:'PO-IND-2025-002', createdAt:'2025-05-10' },
  { id:'INV-004', invoiceNo:'INV-2025-0009', invoiceDate:'2025-05-05', workBoqRef:'BOQ-MEC-001', invoiceAmount:1500000, gst:270000, totalAmount:1770000, invoiceStatus:'Rejected',     paymentStatus:'Pending', dueDate:'2025-06-04', projectId:'VE-2025-002', poNo:'PO-IND-2025-002', createdAt:'2025-05-05' },
  { id:'INV-005', invoiceNo:'INV-2025-0008', invoiceDate:'2025-04-28', workBoqRef:'BOQ-CIV-002', invoiceAmount:2200000, gst:396000, totalAmount:2596000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-05-27', projectId:'VE-2025-003', poNo:'PO-IND-2025-003', createdAt:'2025-04-28' },
  { id:'INV-006', invoiceNo:'INV-2025-0007', invoiceDate:'2025-04-20', workBoqRef:'BOQ-ELE-001', invoiceAmount:875000,  gst:157500, totalAmount:1032500, invoiceStatus:'Approved',     paymentStatus:'Partial', dueDate:'2025-05-20', projectId:'VE-2025-003', poNo:'PO-IND-2025-003', createdAt:'2025-04-20' },
  { id:'INV-007', invoiceNo:'INV-2025-0006', invoiceDate:'2025-04-15', workBoqRef:'BOQ-STR-001', invoiceAmount:1650000, gst:297000, totalAmount:1947000, invoiceStatus:'Draft',        paymentStatus:'Pending', dueDate:'2025-05-15', projectId:'VE-2025-004', poNo:'PO-IND-2025-004', createdAt:'2025-04-15' },
  { id:'INV-008', invoiceNo:'INV-2025-0005', invoiceDate:'2025-04-10', workBoqRef:'BOQ-CIV-004', invoiceAmount:925000,  gst:166500, totalAmount:1091500, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-05-10', projectId:'VE-2025-005', poNo:'PO-IND-2025-005', createdAt:'2025-04-10' },
];

// Smart PO search — matches numeric suffix or any segment
export function matchesPO(invoicePO: string, search: string): boolean {
  if (!search) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const getNum = (s: string) => s.replace(/[^0-9]/g,'');
  const searchNorm = norm(search);
  const invNorm    = norm(invoicePO);
  const searchNum  = getNum(search);
  const invNum     = getNum(invoicePO);
  return invNorm.includes(searchNorm) ||
         (searchNum.length >= 3 && invNum.endsWith(searchNum)) ||
         (searchNum.length >= 3 && invNum.includes(searchNum));
}

export const INVOICE_PROJECTS: Record<string, any> = {
  'VE-2025-001': { id:'VE-2025-001', site:'Andheri Tower Site',    region:'Maharashtra', pm:'Arun Kumar',   poNo:'PO-IND-2025-001', poValue:5000000,  status:'in_progress',    startDate:'2025-01-15', endDate:'2025-07-30' },
  'VE-2025-002': { id:'VE-2025-002', site:'Bandra Roof Site',      region:'Maharashtra', pm:'Priya Sharma', poNo:'PO-IND-2025-002', poValue:3500000,  status:'in_progress',    startDate:'2025-02-01', endDate:'2025-08-31' },
  'VE-2025-003': { id:'VE-2025-003', site:'Kurla Junction Tower',  region:'Maharashtra', pm:'Arun Kumar',   poNo:'PO-IND-2025-003', poValue:4200000,  status:'billing_review', startDate:'2025-02-10', endDate:'2025-09-15' },
  'VE-2025-004': { id:'VE-2025-004', site:'Pune Kharadi Site',     region:'Maharashtra', pm:'Priya Sharma', poNo:'PO-IND-2025-004', poValue:2800000,  status:'in_progress',    startDate:'2025-03-01', endDate:'2025-10-31' },
  'VE-2025-005': { id:'VE-2025-005', site:'Chennai Hub Site',      region:'Tamil Nadu',  pm:'Arun Kumar',   poNo:'PO-IND-2025-005', poValue:6500000,  status:'completed',      startDate:'2024-12-01', endDate:'2025-03-31' },
};
