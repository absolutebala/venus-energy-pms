// Shared expenses/payments data
// Accounting team records payments per vendor per project
// Paid Amount in Financial Summary = sum of all transactions for that project

export interface PaymentTransaction {
  id:         string;
  projectId:  string;
  vendor:     string;
  amount:     number;
  date:       string;
  txnNumber:  string;
  description:string;
  addedBy:    string;
  addedAt:    string;
}

export const PAYMENT_TRANSACTIONS: PaymentTransaction[] = [
  { id:'TXN-001', projectId:'VE-2025-001', vendor:'ABC Telecom Services',    amount:500000,  date:'2025-04-15', txnNumber:'HDFC20250415001', description:'Advance payment - mobilisation',    addedBy:'Accounting Team', addedAt:'15/04/2025 10:30 AM' },
  { id:'TXN-002', projectId:'VE-2025-001', vendor:'ABC Telecom Services',    amount:450000,  date:'2025-05-10', txnNumber:'HDFC20250510002', description:'Progress payment - 65% completion', addedBy:'Accounting Team', addedAt:'10/05/2025 02:15 PM' },
  { id:'TXN-003', projectId:'VE-2025-003', vendor:'TowerTech Pvt Ltd',       amount:600000,  date:'2025-05-18', txnNumber:'ICICI20250518001', description:'Final payment on completion',       addedBy:'Accounting Team', addedAt:'18/05/2025 11:00 AM' },
  { id:'TXN-004', projectId:'VE-2025-007', vendor:'PowerSys India',          amount:700000,  date:'2025-05-20', txnNumber:'SBI20250520003',   description:'Full payment - project complete',   addedBy:'Accounting Team', addedAt:'20/05/2025 04:45 PM' },
  { id:'TXN-005', projectId:'VE-2025-002', vendor:'XYZ Infra Solutions',     amount:100000,  date:'2025-04-01', txnNumber:'HDFC20250401005', description:'Advance payment',                   addedBy:'Accounting Team', addedAt:'01/04/2025 09:00 AM' },
];

// Get total paid for a project
export const getPaidAmount = (projectId: string, transactions: PaymentTransaction[] = PAYMENT_TRANSACTIONS) =>
  transactions.filter(t => t.projectId === projectId).reduce((a, t) => a + t.amount, 0);

// Get transactions for a project
export const getProjectTransactions = (projectId: string, transactions: PaymentTransaction[] = PAYMENT_TRANSACTIONS) =>
  transactions.filter(t => t.projectId === projectId);

// Vendor → projects mapping
export const VENDOR_PROJECTS: Record<string, { id:string; name:string; poValue:number; billedAmount:number }[]> = {
  'ABC Telecom Services':    [{ id:'VE-2025-001', name:'Chennai Metro Phase II', poValue:1850000, billedAmount:1200000 }],
  'XYZ Infra Solutions':     [{ id:'VE-2025-002', name:'Bengaluru East Maint.',  poValue:420000,  billedAmount:150000  }, { id:'VE-2025-008', name:'Delhi NCR Maintenance', poValue:380000, billedAmount:200000 }],
  'TowerTech Pvt Ltd':       [{ id:'VE-2025-003', name:'Hyderabad Component',    poValue:760000,  billedAmount:760000  }, { id:'VE-2025-009', name:'Kochi Component Repl.', poValue:650000, billedAmount:250000 }],
  'BuildRight Constructions':[{ id:'VE-2025-006', name:'Pune Civil Works',       poValue:540000,  billedAmount:100000  }],
  'PowerSys India':          [{ id:'VE-2025-007', name:'Mumbai Power Works',     poValue:890000,  billedAmount:890000  }],
};
