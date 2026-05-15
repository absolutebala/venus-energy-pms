// ════════════════════════════════════════════════════════════
// Venus Energy PMS — Master Seed Data
// Single source of truth for all mock data across the portal
// ════════════════════════════════════════════════════════════

export type ProjectStatus =
  | 'not_started' | 'in_progress' | 'delayed' | 'on_hold'
  | 'submitted' | 'under_review' | 'pm_approved'
  | 'billing_review' | 'completed';

export interface Project {
  id: string; poNo: string; indusId: string; site: string;
  region: string; type: string; pm: string; rm: string;
  vendor: string; vendorContact: string; vendorPhone: string; vendorEmail: string;
  status: ProjectStatus; poValue: number; startDate: string; endDate: string;
  workScope: string; remarks: string; aging: number;
}

// ── 15 Projects ──────────────────────────────────────────────────────────────
export const PROJECTS: Project[] = [
  {
    id:'VE-2025-001', poNo:'PO-2025-001', indusId:'IND-1001',
    site:'Chennai Metro Phase II', region:'Tamil Nadu', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'ABC Telecom Services', vendorContact:'Rajesh Nair', vendorPhone:'+91 98400 11001', vendorEmail:'rajesh@abctelecom.com',
    status:'in_progress', poValue:4500000, startDate:'2025-01-10', endDate:'2026-07-31',
    workScope:'Installation of 30m steel lattice towers at Chennai Metro Phase II corridor.',
    remarks:'Site access cleared. Foundation work 70% complete.', aging:125,
  },
  {
    id:'VE-2025-002', poNo:'PO-2025-002', indusId:'IND-1002',
    site:'Bangalore Ring Road Node', region:'Karnataka', type:'Equipment Installation',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'XYZ Infra Solutions', vendorContact:'Vikram Rao', vendorPhone:'+91 98400 11002', vendorEmail:'vikram@xyzinfra.com',
    status:'completed', poValue:3250000, startDate:'2024-10-01', endDate:'2026-02-28',
    workScope:'RRU and antenna installation at Bangalore Ring Road network node.',
    remarks:'All work completed. Billing in final stage.', aging:196,
  },
  {
    id:'VE-2025-003', poNo:'PO-2025-003', indusId:'IND-1003',
    site:'Mumbai Harbour Link Tower', region:'Maharashtra', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'TowerTech Pvt Ltd', vendorContact:'Sanjay Mehta', vendorPhone:'+91 98400 11003', vendorEmail:'sanjay@towertech.com',
    status:'billing_review', poValue:5800000, startDate:'2024-11-15', endDate:'2026-04-30',
    workScope:'Offshore-grade tower installation at Mumbai Harbour Link site.',
    remarks:'PM approved. All STN materials returned. Pending billing clearance.', aging:181,
  },
  {
    id:'VE-2025-004', poNo:'PO-2025-004', indusId:'IND-1004',
    site:'Hyderabad IT Corridor Hub', region:'Telangana', type:'Fiber & Power',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'NetConnect Services', vendorContact:'Deepa Krishnan', vendorPhone:'+91 98400 11004', vendorEmail:'deepa@netconnect.com',
    status:'in_progress', poValue:2750000, startDate:'2025-02-01', endDate:'2026-08-31',
    workScope:'Fiber backbone and power backup installation at Hyderabad IT Corridor.',
    remarks:'Civil work done. Equipment delivery pending.', aging:103,
  },
  {
    id:'VE-2025-005', poNo:'PO-2025-005', indusId:'IND-1005',
    site:'Delhi NCR Expansion Zone', region:'Delhi', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'PowerSys India', vendorContact:'Amit Verma', vendorPhone:'+91 98400 11005', vendorEmail:'amit@powersys.com',
    status:'delayed', poValue:4100000, startDate:'2025-01-20', endDate:'2026-06-30',
    workScope:'Multi-tower expansion across Delhi NCR zones 4 and 5.',
    remarks:'Delayed due to municipal clearance. Revised timeline under review.', aging:115,
  },
  {
    id:'VE-2025-006', poNo:'PO-2025-006', indusId:'IND-1006',
    site:'Kochi Smart City Node', region:'Kerala', type:'Equipment Installation',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'BuildRight Constructions', vendorContact:'Rajan Pillai', vendorPhone:'+91 98400 11006', vendorEmail:'rajan@buildright.com',
    status:'pm_approved', poValue:1950000, startDate:'2025-02-15', endDate:'2026-05-31',
    workScope:'Smart city network node installation at Kochi waterfront.',
    remarks:'PM approved. Awaiting billing review unlock.', aging:89,
  },
  {
    id:'VE-2025-007', poNo:'PO-2025-007', indusId:'IND-1007',
    site:'Pune IT Park Tower', region:'Maharashtra', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'ABC Telecom Services', vendorContact:'Rajesh Nair', vendorPhone:'+91 98400 11001', vendorEmail:'rajesh@abctelecom.com',
    status:'in_progress', poValue:3375000, startDate:'2025-03-01', endDate:'2026-09-30',
    workScope:'Greenfield tower installation at Pune IT Park Phase III.',
    remarks:'Foundation complete. Tower erection in progress.', aging:75,
  },
  {
    id:'VE-2025-008', poNo:'PO-2025-008', indusId:'IND-1008',
    site:'Ahmedabad Metro Corridor', region:'Gujarat', type:'Fiber & Power',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'XYZ Infra Solutions', vendorContact:'Vikram Rao', vendorPhone:'+91 98400 11002', vendorEmail:'vikram@xyzinfra.com',
    status:'not_started', poValue:2200000, startDate:'2025-06-01', endDate:'2026-11-30',
    workScope:'Underground fiber and OFC installation along Ahmedabad Metro corridor.',
    remarks:'PO received. Vendor mobilisation scheduled for June 2025.', aging:0,
  },
  {
    id:'VE-2025-009', poNo:'PO-2025-009', indusId:'IND-1009',
    site:'Jaipur Smart Grid Site', region:'Rajasthan', type:'Equipment Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'TowerTech Pvt Ltd', vendorContact:'Sanjay Mehta', vendorPhone:'+91 98400 11003', vendorEmail:'sanjay@towertech.com',
    status:'in_progress', poValue:1850000, startDate:'2025-03-15', endDate:'2026-08-15',
    workScope:'Smart grid monitoring equipment installation at Jaipur substations.',
    remarks:'60% complete. Testing phase starts next month.', aging:61,
  },
  {
    id:'VE-2025-010', poNo:'PO-2025-010', indusId:'IND-1010',
    site:'Kolkata Port Trust Tower', region:'West Bengal', type:'Tower Installation',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'NetConnect Services', vendorContact:'Deepa Krishnan', vendorPhone:'+91 98400 11004', vendorEmail:'deepa@netconnect.com',
    status:'completed', poValue:2900000, startDate:'2024-09-01', endDate:'2026-01-31',
    workScope:'Port authority communication tower at Kolkata Dock complex.',
    remarks:'Fully commissioned and handed over.', aging:257,
  },
  {
    id:'VE-2025-011', poNo:'PO-2025-011', indusId:'IND-1011',
    site:'Surat Diamond Bourse Node', region:'Gujarat', type:'Equipment Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'PowerSys India', vendorContact:'Amit Verma', vendorPhone:'+91 98400 11005', vendorEmail:'amit@powersys.com',
    status:'in_progress', poValue:3625000, startDate:'2025-02-20', endDate:'2026-09-20',
    workScope:'High-availability network node at Surat Diamond Bourse complex.',
    remarks:'Critical site. Dual-power backup being installed.', aging:84,
  },
  {
    id:'VE-2025-012', poNo:'PO-2025-012', indusId:'IND-1012',
    site:'Coimbatore Industrial Hub', region:'Tamil Nadu', type:'Fiber & Power',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'BuildRight Constructions', vendorContact:'Rajan Pillai', vendorPhone:'+91 98400 11006', vendorEmail:'rajan@buildright.com',
    status:'delayed', poValue:2475000, startDate:'2025-01-15', endDate:'2026-05-15',
    workScope:'Industrial hub OFC ring network installation at Coimbatore.',
    remarks:'Delayed — heavy rain damage to trench work. Insurance claim filed.', aging:120,
  },
  {
    id:'VE-2025-013', poNo:'PO-2025-013', indusId:'IND-1013',
    site:'Vizag Port Expansion', region:'Andhra Pradesh', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'ABC Telecom Services', vendorContact:'Rajesh Nair', vendorPhone:'+91 98400 11001', vendorEmail:'rajesh@abctelecom.com',
    status:'billing_review', poValue:4700000, startDate:'2024-10-15', endDate:'2026-03-31',
    workScope:'Port expansion communication infrastructure — towers and backhaul links.',
    remarks:'All work done. Material return verified. Billing in progress.', aging:212,
  },
  {
    id:'VE-2025-014', poNo:'PO-2025-014', indusId:'IND-1014',
    site:'Chandigarh Smart City Hub', region:'Punjab', type:'Equipment Installation',
    pm:'Priya Sharma', rm:'Suresh Iyer',
    vendor:'XYZ Infra Solutions', vendorContact:'Vikram Rao', vendorPhone:'+91 98400 11002', vendorEmail:'vikram@xyzinfra.com',
    status:'pm_approved', poValue:1550000, startDate:'2025-03-01', endDate:'2026-07-31',
    workScope:'Smart city surveillance and communication equipment installation.',
    remarks:'PM sign-off received. Finance team to process billing.', aging:75,
  },
  {
    id:'VE-2025-015', poNo:'PO-2025-015', indusId:'IND-1015',
    site:'Nagpur Metro Phase I', region:'Maharashtra', type:'Tower Installation',
    pm:'Arun Kumar', rm:'Ramesh Kumar',
    vendor:'TowerTech Pvt Ltd', vendorContact:'Sanjay Mehta', vendorPhone:'+91 98400 11003', vendorEmail:'sanjay@towertech.com',
    status:'in_progress', poValue:5200000, startDate:'2025-01-05', endDate:'2026-10-31',
    workScope:'Greenfield multi-tower deployment across Nagpur Metro Phase I corridor.',
    remarks:'On track. 45% complete as of May 2025.', aging:130,
  },
];

// ── Invoices (3-4 per active project) ────────────────────────────────────────
export interface Invoice {
  id: string; invoiceNo: string; invoiceDate: string; workBoqRef: string;
  invoiceAmount: number; gst: number; totalAmount: number;
  invoiceStatus: string; paymentStatus: string; dueDate: string;
  projectId: string; poNo: string; createdAt: string;
}

export const SHARED_INVOICES: Invoice[] = [
  // VE-2025-001 Chennai Metro
  { id:'i001', invoiceNo:'INV-2025-001-A', invoiceDate:'2025-02-15', workBoqRef:'BOQ-CHN-001', invoiceAmount:1200000, gst:216000, totalAmount:1416000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-17', projectId:'VE-2025-001', poNo:'PO-2025-001', createdAt:'2025-02-15' },
  { id:'i002', invoiceNo:'INV-2025-001-B', invoiceDate:'2025-03-20', workBoqRef:'BOQ-CHN-002', invoiceAmount:1500000, gst:270000, totalAmount:1770000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-04-19', projectId:'VE-2025-001', poNo:'PO-2025-001', createdAt:'2025-03-20' },
  { id:'i003', invoiceNo:'INV-2025-001-C', invoiceDate:'2025-05-01', workBoqRef:'BOQ-CHN-003', invoiceAmount:1000000, gst:180000, totalAmount:1180000, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-05-31', projectId:'VE-2025-001', poNo:'PO-2025-001', createdAt:'2025-05-01' },
  // VE-2025-002 Bangalore (completed)
  { id:'i004', invoiceNo:'INV-2025-002-A', invoiceDate:'2024-11-10', workBoqRef:'BOQ-BLR-001', invoiceAmount:1100000, gst:198000, totalAmount:1298000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2024-12-10', projectId:'VE-2025-002', poNo:'PO-2025-002', createdAt:'2024-11-10' },
  { id:'i005', invoiceNo:'INV-2025-002-B', invoiceDate:'2025-01-15', workBoqRef:'BOQ-BLR-002', invoiceAmount:1200000, gst:216000, totalAmount:1416000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-02-14', projectId:'VE-2025-002', poNo:'PO-2025-002', createdAt:'2025-01-15' },
  { id:'i006', invoiceNo:'INV-2025-002-C', invoiceDate:'2025-02-28', workBoqRef:'BOQ-BLR-003', invoiceAmount:950000,  gst:171000, totalAmount:1121000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-30', projectId:'VE-2025-002', poNo:'PO-2025-002', createdAt:'2025-02-28' },
  // VE-2025-003 Mumbai Harbour (billing_review)
  { id:'i007', invoiceNo:'INV-2025-003-A', invoiceDate:'2025-01-20', workBoqRef:'BOQ-MUM-001', invoiceAmount:2000000, gst:360000, totalAmount:2360000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-02-19', projectId:'VE-2025-003', poNo:'PO-2025-003', createdAt:'2025-01-20' },
  { id:'i008', invoiceNo:'INV-2025-003-B', invoiceDate:'2025-03-10', workBoqRef:'BOQ-MUM-002', invoiceAmount:2200000, gst:396000, totalAmount:2596000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-04-09', projectId:'VE-2025-003', poNo:'PO-2025-003', createdAt:'2025-03-10' },
  { id:'i009', invoiceNo:'INV-2025-003-C', invoiceDate:'2025-04-25', workBoqRef:'BOQ-MUM-003', invoiceAmount:1600000, gst:288000, totalAmount:1888000, invoiceStatus:'Under Review', paymentStatus:'Pending', dueDate:'2025-05-25', projectId:'VE-2025-003', poNo:'PO-2025-003', createdAt:'2025-04-25' },
  // VE-2025-004 Hyderabad
  { id:'i010', invoiceNo:'INV-2025-004-A', invoiceDate:'2025-03-05', workBoqRef:'BOQ-HYD-001', invoiceAmount:900000,  gst:162000, totalAmount:1062000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-04-04', projectId:'VE-2025-004', poNo:'PO-2025-004', createdAt:'2025-03-05' },
  { id:'i011', invoiceNo:'INV-2025-004-B', invoiceDate:'2025-04-20', workBoqRef:'BOQ-HYD-002', invoiceAmount:850000,  gst:153000, totalAmount:1003000, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-05-20', projectId:'VE-2025-004', poNo:'PO-2025-004', createdAt:'2025-04-20' },
  // VE-2025-005 Delhi (delayed)
  { id:'i012', invoiceNo:'INV-2025-005-A', invoiceDate:'2025-02-28', workBoqRef:'BOQ-DEL-001', invoiceAmount:1400000, gst:252000, totalAmount:1652000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-30', projectId:'VE-2025-005', poNo:'PO-2025-005', createdAt:'2025-02-28' },
  { id:'i013', invoiceNo:'INV-2025-005-B', invoiceDate:'2025-04-15', workBoqRef:'BOQ-DEL-002', invoiceAmount:1100000, gst:198000, totalAmount:1298000, invoiceStatus:'Rejected',     paymentStatus:'Pending', dueDate:'2025-05-15', projectId:'VE-2025-005', poNo:'PO-2025-005', createdAt:'2025-04-15' },
  // VE-2025-006 Kochi (pm_approved)
  { id:'i014', invoiceNo:'INV-2025-006-A', invoiceDate:'2025-03-20', workBoqRef:'BOQ-KCH-001', invoiceAmount:800000,  gst:144000, totalAmount:944000,  invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-04-19', projectId:'VE-2025-006', poNo:'PO-2025-006', createdAt:'2025-03-20' },
  { id:'i015', invoiceNo:'INV-2025-006-B', invoiceDate:'2025-05-05', workBoqRef:'BOQ-KCH-002', invoiceAmount:700000,  gst:126000, totalAmount:826000,  invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-06-04', projectId:'VE-2025-006', poNo:'PO-2025-006', createdAt:'2025-05-05' },
  // VE-2025-007 Pune
  { id:'i016', invoiceNo:'INV-2025-007-A', invoiceDate:'2025-04-01', workBoqRef:'BOQ-PUN-001', invoiceAmount:1100000, gst:198000, totalAmount:1298000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-05-01', projectId:'VE-2025-007', poNo:'PO-2025-007', createdAt:'2025-04-01' },
  { id:'i017', invoiceNo:'INV-2025-007-B', invoiceDate:'2025-05-10', workBoqRef:'BOQ-PUN-002', invoiceAmount:950000,  gst:171000, totalAmount:1121000, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-06-09', projectId:'VE-2025-007', poNo:'PO-2025-007', createdAt:'2025-05-10' },
  // VE-2025-009 Jaipur
  { id:'i018', invoiceNo:'INV-2025-009-A', invoiceDate:'2025-04-10', workBoqRef:'BOQ-JAI-001', invoiceAmount:700000,  gst:126000, totalAmount:826000,  invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-05-10', projectId:'VE-2025-009', poNo:'PO-2025-009', createdAt:'2025-04-10' },
  // VE-2025-010 Kolkata (completed)
  { id:'i019', invoiceNo:'INV-2025-010-A', invoiceDate:'2024-10-15', workBoqRef:'BOQ-KOL-001', invoiceAmount:1000000, gst:180000, totalAmount:1180000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2024-11-14', projectId:'VE-2025-010', poNo:'PO-2025-010', createdAt:'2024-10-15' },
  { id:'i020', invoiceNo:'INV-2025-010-B', invoiceDate:'2024-12-01', workBoqRef:'BOQ-KOL-002', invoiceAmount:1100000, gst:198000, totalAmount:1298000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2024-12-31', projectId:'VE-2025-010', poNo:'PO-2025-010', createdAt:'2024-12-01' },
  { id:'i021', invoiceNo:'INV-2025-010-C', invoiceDate:'2025-01-20', workBoqRef:'BOQ-KOL-003', invoiceAmount:700000,  gst:126000, totalAmount:826000,  invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-02-19', projectId:'VE-2025-010', poNo:'PO-2025-010', createdAt:'2025-01-20' },
  // VE-2025-011 Surat
  { id:'i022', invoiceNo:'INV-2025-011-A', invoiceDate:'2025-04-01', workBoqRef:'BOQ-SUR-001', invoiceAmount:1200000, gst:216000, totalAmount:1416000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-05-01', projectId:'VE-2025-011', poNo:'PO-2025-011', createdAt:'2025-04-01' },
  // VE-2025-012 Coimbatore (delayed)
  { id:'i023', invoiceNo:'INV-2025-012-A', invoiceDate:'2025-02-20', workBoqRef:'BOQ-CBE-001', invoiceAmount:800000,  gst:144000, totalAmount:944000,  invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-22', projectId:'VE-2025-012', poNo:'PO-2025-012', createdAt:'2025-02-20' },
  // VE-2025-013 Vizag (billing_review)
  { id:'i024', invoiceNo:'INV-2025-013-A', invoiceDate:'2024-12-01', workBoqRef:'BOQ-VZG-001', invoiceAmount:1600000, gst:288000, totalAmount:1888000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2024-12-31', projectId:'VE-2025-013', poNo:'PO-2025-013', createdAt:'2024-12-01' },
  { id:'i025', invoiceNo:'INV-2025-013-B', invoiceDate:'2025-02-01', workBoqRef:'BOQ-VZG-002', invoiceAmount:1800000, gst:324000, totalAmount:2124000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-03', projectId:'VE-2025-013', poNo:'PO-2025-013', createdAt:'2025-02-01' },
  { id:'i026', invoiceNo:'INV-2025-013-C', invoiceDate:'2025-03-25', workBoqRef:'BOQ-VZG-003', invoiceAmount:1300000, gst:234000, totalAmount:1534000, invoiceStatus:'Under Review', paymentStatus:'Pending', dueDate:'2025-04-24', projectId:'VE-2025-013', poNo:'PO-2025-013', createdAt:'2025-03-25' },
  // VE-2025-014 Chandigarh (pm_approved)
  { id:'i027', invoiceNo:'INV-2025-014-A', invoiceDate:'2025-04-05', workBoqRef:'BOQ-CHD-001', invoiceAmount:700000,  gst:126000, totalAmount:826000,  invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-05-05', projectId:'VE-2025-014', poNo:'PO-2025-014', createdAt:'2025-04-05' },
  // VE-2025-015 Nagpur
  { id:'i028', invoiceNo:'INV-2025-015-A', invoiceDate:'2025-02-10', workBoqRef:'BOQ-NGP-001', invoiceAmount:1500000, gst:270000, totalAmount:1770000, invoiceStatus:'Approved',     paymentStatus:'Paid',    dueDate:'2025-03-12', projectId:'VE-2025-015', poNo:'PO-2025-015', createdAt:'2025-02-10' },
  { id:'i029', invoiceNo:'INV-2025-015-B', invoiceDate:'2025-04-01', workBoqRef:'BOQ-NGP-002', invoiceAmount:1600000, gst:288000, totalAmount:1888000, invoiceStatus:'Submitted',    paymentStatus:'Pending', dueDate:'2025-05-01', projectId:'VE-2025-015', poNo:'PO-2025-015', createdAt:'2025-04-01' },
];

// Smart PO search
export function matchesPO(invoicePO: string, search: string): boolean {
  if (!search || search.length < 2) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const getNum = (s: string) => s.replace(/[^0-9]/g,'');
  const sn = norm(search), tn = norm(invoicePO);
  const sg = getNum(search), tg = getNum(invoicePO);
  return tn.includes(sn) || (sg.length >= 3 && (tg.endsWith(sg) || tg.includes(sg)));
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export interface Expense {
  id: number; txnRef: string; date: string; site: string;
  expenseType: string; amount: number; paymentMode: string; projectId: string;
}

export const SHARED_EXPENSES: Expense[] = [
  // VE-2025-001
  { id:1,  txnRef:'EXP-001-001', date:'2025-01-20', site:'Chennai Metro Phase II', expenseType:'Advance',           amount:200000, paymentMode:'Bank Transfer', projectId:'VE-2025-001' },
  { id:2,  txnRef:'EXP-001-002', date:'2025-02-10', site:'Chennai Metro Phase II', expenseType:'Material Purchase', amount:350000, paymentMode:'Cheque',        projectId:'VE-2025-001' },
  { id:3,  txnRef:'EXP-001-003', date:'2025-03-05', site:'Chennai Metro Phase II', expenseType:'Labour Charge',     amount:125000, paymentMode:'Cash',          projectId:'VE-2025-001' },
  { id:4,  txnRef:'EXP-001-004', date:'2025-04-12', site:'Chennai Metro Phase II', expenseType:'Transport',         amount:45000,  paymentMode:'UPI',           projectId:'VE-2025-001' },
  // VE-2025-002
  { id:5,  txnRef:'EXP-002-001', date:'2024-10-15', site:'Bangalore Ring Road Node', expenseType:'Advance',         amount:150000, paymentMode:'Bank Transfer', projectId:'VE-2025-002' },
  { id:6,  txnRef:'EXP-002-002', date:'2024-11-20', site:'Bangalore Ring Road Node', expenseType:'Equipment Rental',amount:80000,  paymentMode:'Cheque',        projectId:'VE-2025-002' },
  // VE-2025-003
  { id:7,  txnRef:'EXP-003-001', date:'2024-12-01', site:'Mumbai Harbour Link Tower', expenseType:'Advance',        amount:300000, paymentMode:'Bank Transfer', projectId:'VE-2025-003' },
  { id:8,  txnRef:'EXP-003-002', date:'2025-01-10', site:'Mumbai Harbour Link Tower', expenseType:'Material Purchase',amount:520000,paymentMode:'Cheque',        projectId:'VE-2025-003' },
  { id:9,  txnRef:'EXP-003-003', date:'2025-02-20', site:'Mumbai Harbour Link Tower', expenseType:'Labour Charge',  amount:180000, paymentMode:'Cash',          projectId:'VE-2025-003' },
  // VE-2025-004
  { id:10, txnRef:'EXP-004-001', date:'2025-02-10', site:'Hyderabad IT Corridor Hub', expenseType:'Advance',        amount:100000, paymentMode:'Bank Transfer', projectId:'VE-2025-004' },
  { id:11, txnRef:'EXP-004-002', date:'2025-03-15', site:'Hyderabad IT Corridor Hub', expenseType:'Transport',      amount:35000,  paymentMode:'UPI',           projectId:'VE-2025-004' },
  // VE-2025-005
  { id:12, txnRef:'EXP-005-001', date:'2025-02-01', site:'Delhi NCR Expansion Zone',  expenseType:'Advance',        amount:180000, paymentMode:'Bank Transfer', projectId:'VE-2025-005' },
  { id:13, txnRef:'EXP-005-002', date:'2025-03-10', site:'Delhi NCR Expansion Zone',  expenseType:'Miscellaneous',  amount:25000,  paymentMode:'Cash',          projectId:'VE-2025-005' },
  // VE-2025-006
  { id:14, txnRef:'EXP-006-001', date:'2025-03-01', site:'Kochi Smart City Node',     expenseType:'Advance',        amount:90000,  paymentMode:'Bank Transfer', projectId:'VE-2025-006' },
  // VE-2025-007
  { id:15, txnRef:'EXP-007-001', date:'2025-03-10', site:'Pune IT Park Tower',        expenseType:'Advance',        amount:120000, paymentMode:'Bank Transfer', projectId:'VE-2025-007' },
  { id:16, txnRef:'EXP-007-002', date:'2025-04-05', site:'Pune IT Park Tower',        expenseType:'Labour Charge',  amount:95000,  paymentMode:'Cash',          projectId:'VE-2025-007' },
  // VE-2025-009
  { id:17, txnRef:'EXP-009-001', date:'2025-03-20', site:'Jaipur Smart Grid Site',    expenseType:'Advance',        amount:75000,  paymentMode:'Bank Transfer', projectId:'VE-2025-009' },
  // VE-2025-010
  { id:18, txnRef:'EXP-010-001', date:'2024-09-15', site:'Kolkata Port Trust Tower',  expenseType:'Advance',        amount:130000, paymentMode:'Bank Transfer', projectId:'VE-2025-010' },
  { id:19, txnRef:'EXP-010-002', date:'2024-11-01', site:'Kolkata Port Trust Tower',  expenseType:'Equipment Rental',amount:65000, paymentMode:'Cheque',        projectId:'VE-2025-010' },
  // VE-2025-011
  { id:20, txnRef:'EXP-011-001', date:'2025-03-01', site:'Surat Diamond Bourse Node', expenseType:'Advance',        amount:150000, paymentMode:'Bank Transfer', projectId:'VE-2025-011' },
  { id:21, txnRef:'EXP-011-002', date:'2025-04-10', site:'Surat Diamond Bourse Node', expenseType:'Material Purchase',amount:280000,paymentMode:'Cheque',        projectId:'VE-2025-011' },
  // VE-2025-012
  { id:22, txnRef:'EXP-012-001', date:'2025-01-25', site:'Coimbatore Industrial Hub', expenseType:'Advance',        amount:100000, paymentMode:'Bank Transfer', projectId:'VE-2025-012' },
  // VE-2025-013
  { id:23, txnRef:'EXP-013-001', date:'2024-10-20', site:'Vizag Port Expansion',      expenseType:'Advance',        amount:220000, paymentMode:'Bank Transfer', projectId:'VE-2025-013' },
  { id:24, txnRef:'EXP-013-002', date:'2024-12-15', site:'Vizag Port Expansion',      expenseType:'Labour Charge',  amount:160000, paymentMode:'Cash',          projectId:'VE-2025-013' },
  { id:25, txnRef:'EXP-013-003', date:'2025-02-10', site:'Vizag Port Expansion',      expenseType:'Transport',      amount:55000,  paymentMode:'UPI',           projectId:'VE-2025-013' },
  // VE-2025-014
  { id:26, txnRef:'EXP-014-001', date:'2025-03-10', site:'Chandigarh Smart City Hub', expenseType:'Advance',        amount:80000,  paymentMode:'Bank Transfer', projectId:'VE-2025-014' },
  // VE-2025-015
  { id:27, txnRef:'EXP-015-001', date:'2025-01-15', site:'Nagpur Metro Phase I',      expenseType:'Advance',        amount:250000, paymentMode:'Bank Transfer', projectId:'VE-2025-015' },
  { id:28, txnRef:'EXP-015-002', date:'2025-03-01', site:'Nagpur Metro Phase I',      expenseType:'Material Purchase',amount:420000,paymentMode:'Cheque',        projectId:'VE-2025-015' },
  { id:29, txnRef:'EXP-015-003', date:'2025-04-20', site:'Nagpur Metro Phase I',      expenseType:'Labour Charge',  amount:140000, paymentMode:'Cash',          projectId:'VE-2025-015' },
];

// INVOICE_PROJECTS helper for invoice page lookups
export const INVOICE_PROJECTS: Record<string, any> = Object.fromEntries(
  PROJECTS.map(p => [p.id, p])
);

// PO Items per project
export const PO_ITEMS: Record<string, any[]> = {
  'VE-2025-001': [
    { id:1, description:'Steel Lattice Tower 30m',     hsn:'7308', uom:'Set', quantity:4,  rate:450000, gst:18, amount:1800000 },
    { id:2, description:'Foundation Concrete M40',     hsn:'3824', uom:'Cum', quantity:80, rate:9500,   gst:12, amount:760000  },
    { id:3, description:'Anchor Bolt Set M36',         hsn:'7318', uom:'Set', quantity:16, rate:8500,   gst:18, amount:136000  },
    { id:4, description:'Tower Lighting Kit',          hsn:'9405', uom:'Nos', quantity:4,  rate:25000,  gst:18, amount:100000  },
  ],
  'VE-2025-003': [
    { id:1, description:'Offshore Tower 40m GI',       hsn:'7308', uom:'Set', quantity:2,  rate:850000, gst:18, amount:1700000 },
    { id:2, description:'High Tensile Bolts M48',      hsn:'7318', uom:'Nos', quantity:96, rate:1200,   gst:18, amount:115200  },
    { id:3, description:'Corrosion Proof Paint',       hsn:'3210', uom:'Ltr', quantity:200,rate:450,    gst:18, amount:90000   },
  ],
  'VE-2025-007': [
    { id:1, description:'Greenfield Tower 25m',        hsn:'7308', uom:'Set', quantity:3,  rate:380000, gst:18, amount:1140000 },
    { id:2, description:'Equipment Shelter 3x3m',      hsn:'9406', uom:'Nos', quantity:3,  rate:95000,  gst:18, amount:285000  },
    { id:3, description:'DG Set 10 KVA',               hsn:'8502', uom:'Nos', quantity:3,  rate:145000, gst:18, amount:435000  },
  ],
  'VE-2025-015': [
    { id:1, description:'Metro Tower 35m',             hsn:'7308', uom:'Set', quantity:6,  rate:520000, gst:18, amount:3120000 },
    { id:2, description:'Foundation Piling Work',      hsn:'3824', uom:'Nos', quantity:24, rate:35000,  gst:12, amount:840000  },
    { id:3, description:'Earthing Kit Complete',       hsn:'8544', uom:'Set', quantity:6,  rate:18000,  gst:18, amount:108000  },
    { id:4, description:'Safety Cage & Ladder',        hsn:'7326', uom:'Set', quantity:6,  rate:22000,  gst:18, amount:132000  },
  ],
};

// Document status per project
export const DOC_STATUS: Record<string, Record<string, boolean>> = {
  'VE-2025-001': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-002': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-003': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-004': { safety_photos:true,  site_photos:false, jmr_document:false, ac_certificate:true,  noc_document:false, drawing_document:true,  ptw_document:false },
  'VE-2025-005': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-006': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:false },
  'VE-2025-007': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:true,  drawing_document:false, ptw_document:true  },
  'VE-2025-008': { safety_photos:false, site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-009': { safety_photos:true,  site_photos:false, jmr_document:false, ac_certificate:true,  noc_document:false, drawing_document:true,  ptw_document:false },
  'VE-2025-010': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-011': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:true,  drawing_document:false, ptw_document:false },
  'VE-2025-012': { safety_photos:true,  site_photos:false, jmr_document:false, ac_certificate:false, noc_document:false, drawing_document:false, ptw_document:false },
  'VE-2025-013': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
  'VE-2025-014': { safety_photos:true,  site_photos:true,  jmr_document:true,  ac_certificate:true,  noc_document:false, drawing_document:true,  ptw_document:false },
  'VE-2025-015': { safety_photos:true,  site_photos:true,  jmr_document:false, ac_certificate:true,  noc_document:true,  drawing_document:true,  ptw_document:true  },
};
