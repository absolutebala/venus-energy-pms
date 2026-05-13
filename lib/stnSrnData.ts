// STN = Store Transfer Note: Indus issues materials TO vendor
// SRN = Store Return Note: Vendor returns balance materials TO Indus
// Flow: STN Qty issued → Vendor logs Utilised Qty → PM approves → Return Qty = STN - Approved

export type UtilisationStatus = 'pending' | 'submitted' | 'pm_approved' | 'pm_rejected';

export interface MaterialItem {
  code:             string;
  description:      string;
  uom:              string;
  stnQty:           number;
  utilisedQty:      number | null; // vendor input
  utilisedRemarks:  string;
  utilisedStatus:   UtilisationStatus;
  pmApprovedQty:    number | null; // PM approved (may differ from vendor input)
  pmRemarks:        string;
  returnQty:        number; // auto: stnQty - pmApprovedQty
  srnQty:           number; // actual returned to Indus
}

export interface ProjectSTNSRN {
  projectId:   string;
  projectName: string;
  poNo:        string;
  vendor:      string;
  pm:          string;
  region:      string;
  status:      string;
  stnDate:     string;
  srnDate:     string | null;
  isOverdue:   boolean;
  materials:   MaterialItem[];
}

export const STN_SRN_DATA: ProjectSTNSRN[] = [
  {
    projectId:'VE-2025-001', projectName:'Chennai Metro Phase II',
    poNo:'PO-2025-001', vendor:'ABC Telecom Services', pm:'Arun Kumar',
    region:'Tamil Nadu', status:'in_progress', stnDate:'01/04/2025', srnDate:null, isOverdue:false,
    materials: [
      { code:'MAT-001', description:'Tower Steel Sections (30m)',  uom:'Set', stnQty:4,   utilisedQty:4,   utilisedRemarks:'All 4 sets used for main tower structure.', utilisedStatus:'pm_approved', pmApprovedQty:4,   pmRemarks:'Verified on site visit.',              returnQty:0,  srnQty:0   },
      { code:'MAT-002', description:'Anchor Bolts M36',           uom:'Nos', stnQty:120, utilisedQty:96,  utilisedRemarks:'96 bolts used, 24 excess.',                utilisedStatus:'pm_approved', pmApprovedQty:96,  pmRemarks:'Approved — 24 to be returned.',         returnQty:24, srnQty:12  },
      { code:'MAT-003', description:'Base Plate 600x600mm',       uom:'Nos', stnQty:4,   utilisedQty:4,   utilisedRemarks:'All 4 base plates installed.',             utilisedStatus:'submitted',   pmApprovedQty:null,pmRemarks:'',                                     returnQty:0,  srnQty:0   },
      { code:'MAT-004', description:'Safety Harness',             uom:'Set', stnQty:10,  utilisedQty:null,utilisedRemarks:'',                                         utilisedStatus:'pending',     pmApprovedQty:null,pmRemarks:'',                                     returnQty:0,  srnQty:0   },
    ],
  },
  {
    projectId:'VE-2025-002', projectName:'Bengaluru East Maint.',
    poNo:'PO-2025-001', vendor:'XYZ Infra Solutions', pm:'Priya Sharma',
    region:'Karnataka', status:'delayed', stnDate:'01/03/2025', srnDate:null, isOverdue:true,
    materials: [
      { code:'MAT-010', description:'Antenna Mounting Brackets',  uom:'Set', stnQty:8,  utilisedQty:6,  utilisedRemarks:'6 brackets installed, 2 spares.',  utilisedStatus:'pm_rejected', pmApprovedQty:null,pmRemarks:'Please provide installation photos for verification.', returnQty:0, srnQty:0  },
      { code:'MAT-011', description:'Coaxial Cable (50m rolls)',  uom:'Nos', stnQty:20, utilisedQty:14, utilisedRemarks:'14 rolls used for antenna feeds.', utilisedStatus:'pm_approved', pmApprovedQty:14,  pmRemarks:'Approved.',                                         returnQty:6, srnQty:6  },
      { code:'MAT-012', description:'Lightning Arrestor',         uom:'Nos', stnQty:4,  utilisedQty:null,utilisedRemarks:'',                                utilisedStatus:'pending',     pmApprovedQty:null,pmRemarks:'',                                                returnQty:0, srnQty:0  },
    ],
  },
  {
    projectId:'VE-2025-003', projectName:'Hyderabad Component',
    poNo:'PO-2025-002', vendor:'TowerTech Pvt Ltd', pm:'Arun Kumar',
    region:'Tamil Nadu', status:'billing_review', stnDate:'10/04/2025', srnDate:'18/05/2025', isOverdue:false,
    materials: [
      { code:'MAT-020', description:'RRU Units (4T)',              uom:'Nos', stnQty:6,   utilisedQty:6,   utilisedRemarks:'All 6 units installed.',          utilisedStatus:'pm_approved', pmApprovedQty:6,   pmRemarks:'Confirmed.',   returnQty:0, srnQty:0   },
      { code:'MAT-021', description:'CPRI Fiber Cable (5m)',      uom:'Nos', stnQty:24,  utilisedQty:22,  utilisedRemarks:'22 used, 2 damaged in transit.',  utilisedStatus:'pm_approved', pmApprovedQty:22,  pmRemarks:'Accepted.',    returnQty:2, srnQty:2   },
      { code:'MAT-022', description:'Power Distribution Box',     uom:'Nos', stnQty:2,   utilisedQty:2,   utilisedRemarks:'Both installed.',                 utilisedStatus:'pm_approved', pmApprovedQty:2,   pmRemarks:'Verified.',    returnQty:0, srnQty:0   },
    ],
  },
  {
    projectId:'VE-2025-006', projectName:'Pune Civil Works',
    poNo:'PO-2025-003', vendor:'BuildRight Constructions', pm:'Pooja Mehta',
    region:'Maharashtra', status:'delayed', stnDate:'01/02/2025', srnDate:null, isOverdue:true,
    materials: [
      { code:'MAT-030', description:'Shuttering Plates',          uom:'Set', stnQty:20,  utilisedQty:12, utilisedRemarks:'12 sets in use, 8 idle.',    utilisedStatus:'submitted',   pmApprovedQty:null,pmRemarks:'', returnQty:0, srnQty:0  },
      { code:'MAT-031', description:'Centering Props',            uom:'Nos', stnQty:100, utilisedQty:80, utilisedRemarks:'80 props deployed on site.', utilisedStatus:'pending',     pmApprovedQty:null,pmRemarks:'', returnQty:0, srnQty:0  },
      { code:'MAT-032', description:'Steel Reinforcement (Fe500)',uom:'MT',  stnQty:5,   utilisedQty:null,utilisedRemarks:'',                           utilisedStatus:'pending',     pmApprovedQty:null,pmRemarks:'', returnQty:0, srnQty:0  },
    ],
  },
  {
    projectId:'VE-2025-007', projectName:'Mumbai Power Works',
    poNo:'PO-2025-004', vendor:'PowerSys India', pm:'Pooja Mehta',
    region:'Maharashtra', status:'completed', stnDate:'05/04/2025', srnDate:'20/05/2025', isOverdue:false,
    materials: [
      { code:'MAT-040', description:'DG Set 30KVA',               uom:'Nos', stnQty:1,   utilisedQty:1,   utilisedRemarks:'Installed permanently.',     utilisedStatus:'pm_approved', pmApprovedQty:1,   pmRemarks:'Confirmed.', returnQty:0, srnQty:0   },
      { code:'MAT-041', description:'Power Cable 4C x 70mm²',     uom:'RMT', stnQty:200, utilisedQty:185, utilisedRemarks:'185m laid, 15m excess.',    utilisedStatus:'pm_approved', pmApprovedQty:185, pmRemarks:'Approved.',  returnQty:15,srnQty:15  },
      { code:'MAT-042', description:'MCB Distribution Board',     uom:'Nos', stnQty:2,   utilisedQty:2,   utilisedRemarks:'Both boards installed.',     utilisedStatus:'pm_approved', pmApprovedQty:2,   pmRemarks:'Verified.',  returnQty:0, srnQty:0   },
    ],
  },
];

export const getVendorMaterials  = (vendor: string) => STN_SRN_DATA.filter(p => p.vendor === vendor);
export const getPMMaterials      = (pm: string)     => STN_SRN_DATA.filter(p => p.pm === pm);
export const getRegionMaterials  = (region: string) => STN_SRN_DATA.filter(p => p.region === region);
export const getOverdueProjects  = ()               => STN_SRN_DATA.filter(p => p.isOverdue);
export const getPendingReturns   = (data: ProjectSTNSRN[]) => data.filter(p => p.materials.some(m => m.returnQty > 0 && m.srnQty < m.returnQty));

export const STATUS_BADGE_COLOR: Record<UtilisationStatus,{color:string;bg:string;label:string}> = {
  pending:     { color:'#64748B', bg:'#F1F5F9', label:'Pending Input'   },
  submitted:   { color:'#2563EB', bg:'#EFF6FF', label:'Submitted to PM' },
  pm_approved: { color:'#16A34A', bg:'#F0FDF4', label:'PM Approved'     },
  pm_rejected: { color:'#DC2626', bg:'#FEF2F2', label:'PM Rejected'     },
};
