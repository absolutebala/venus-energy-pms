// STN = Store Transfer Note: Indus issues materials TO vendor
// SRN = Store Return Note: Vendor returns materials TO Indus

export interface MaterialItem {
  code: string;
  description: string;
  uom: string;
  stnQty: number;
  srnQty: number;
  balance: number;
  returnStatus: 'Fully Returned' | 'Partially Returned' | 'Pending Return' | 'Not Required';
}

export interface ProjectSTNSRN {
  projectId: string;
  projectName: string;
  poNo: string;
  vendor: string;
  pm: string;
  region: string;
  status: string;
  stnDate: string;
  srnDate: string | null;
  isOverdue: boolean;
  materials: MaterialItem[];
}

export const STN_SRN_DATA: ProjectSTNSRN[] = [
  {
    projectId: 'VE-2025-001', projectName: 'Chennai Metro Phase II', poNo: 'PO-2025-001',
    vendor: 'ABC Telecom Services', pm: 'Arun Kumar', region: 'Tamil Nadu',
    status: 'in_progress', stnDate: '01/04/2025', srnDate: null, isOverdue: false,
    materials: [
      { code:'MAT-001', description:'Tower Steel Sections (30m)',  uom:'Set', stnQty:4,   srnQty:0,   balance:4,   returnStatus:'Pending Return'     },
      { code:'MAT-002', description:'Anchor Bolts M36',           uom:'Nos', stnQty:120, srnQty:12,  balance:108, returnStatus:'Partially Returned' },
      { code:'MAT-003', description:'Base Plate 600x600mm',       uom:'Nos', stnQty:4,   srnQty:0,   balance:4,   returnStatus:'Pending Return'     },
      { code:'MAT-004', description:'Safety Harness',             uom:'Set', stnQty:10,  srnQty:10,  balance:0,   returnStatus:'Fully Returned'     },
    ],
  },
  {
    projectId: 'VE-2025-002', projectName: 'Bengaluru East Maint.', poNo: 'PO-2025-001',
    vendor: 'XYZ Infra Solutions', pm: 'Priya Sharma', region: 'Karnataka',
    status: 'delayed', stnDate: '01/03/2025', srnDate: null, isOverdue: true,
    materials: [
      { code:'MAT-010', description:'Antenna Mounting Brackets',  uom:'Set', stnQty:8,   srnQty:0,  balance:8,  returnStatus:'Pending Return'     },
      { code:'MAT-011', description:'Coaxial Cable (50m rolls)',  uom:'Nos', stnQty:20,  srnQty:5,  balance:15, returnStatus:'Partially Returned' },
      { code:'MAT-012', description:'Lightning Arrestor',         uom:'Nos', stnQty:4,   srnQty:4,  balance:0,  returnStatus:'Fully Returned'     },
    ],
  },
  {
    projectId: 'VE-2025-003', projectName: 'Hyderabad Component', poNo: 'PO-2025-002',
    vendor: 'TowerTech Pvt Ltd', pm: 'Arun Kumar', region: 'Tamil Nadu',
    status: 'billing_review', stnDate: '10/04/2025', srnDate: '18/05/2025', isOverdue: false,
    materials: [
      { code:'MAT-020', description:'RRU Units (4T)',              uom:'Nos', stnQty:6,   srnQty:6,  balance:0,  returnStatus:'Fully Returned'     },
      { code:'MAT-021', description:'CPRI Fiber Cable (5m)',      uom:'Nos', stnQty:24,  srnQty:22, balance:2,  returnStatus:'Partially Returned' },
      { code:'MAT-022', description:'Power Distribution Box',     uom:'Nos', stnQty:2,   srnQty:2,  balance:0,  returnStatus:'Fully Returned'     },
    ],
  },
  {
    projectId: 'VE-2025-006', projectName: 'Pune Civil Works', poNo: 'PO-2025-003',
    vendor: 'BuildRight Constructions', pm: 'Pooja Mehta', region: 'Maharashtra',
    status: 'delayed', stnDate: '01/02/2025', srnDate: null, isOverdue: true,
    materials: [
      { code:'MAT-030', description:'Shuttering Plates',          uom:'Set', stnQty:20,  srnQty:5,  balance:15, returnStatus:'Partially Returned' },
      { code:'MAT-031', description:'Centering Props',            uom:'Nos', stnQty:100, srnQty:40, balance:60, returnStatus:'Partially Returned' },
      { code:'MAT-032', description:'Steel Reinforcement (Fe500)',uom:'MT',  stnQty:5,   srnQty:0,  balance:5,  returnStatus:'Pending Return'     },
    ],
  },
  {
    projectId: 'VE-2025-007', projectName: 'Mumbai Power Works', poNo: 'PO-2025-004',
    vendor: 'PowerSys India', pm: 'Pooja Mehta', region: 'Maharashtra',
    status: 'completed', stnDate: '05/04/2025', srnDate: '20/05/2025', isOverdue: false,
    materials: [
      { code:'MAT-040', description:'DG Set 30KVA',               uom:'Nos', stnQty:1,  srnQty:1,  balance:0, returnStatus:'Fully Returned' },
      { code:'MAT-041', description:'Power Cable 4C x 70mm²',     uom:'RMT', stnQty:200,srnQty:200,balance:0, returnStatus:'Fully Returned' },
      { code:'MAT-042', description:'MCB Distribution Board',     uom:'Nos', stnQty:2,  srnQty:2,  balance:0, returnStatus:'Fully Returned' },
    ],
  },
];

export const getVendorMaterials = (vendorName: string) =>
  STN_SRN_DATA.filter(p => p.vendor === vendorName);

export const getPMMaterials = (pmName: string) =>
  STN_SRN_DATA.filter(p => p.pm === pmName);

export const getRegionMaterials = (region: string) =>
  STN_SRN_DATA.filter(p => p.region === region);

export const getOverdueProjects = () =>
  STN_SRN_DATA.filter(p => p.isOverdue);

export const getPendingReturns = (data: ProjectSTNSRN[]) =>
  data.filter(p => p.materials.some(m => m.balance > 0));
