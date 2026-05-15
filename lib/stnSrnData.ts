import { PROJECTS } from './seedData';

// STN/SRN material data keyed by project ID
export const STN_SRN_DATA: any[] = [
  { projectId:'VE-2025-001', poNo:'PO-2025-001', vendor:'ABC Telecom Services', pm:'Arun Kumar',
    materials:[
      { id:1, code:'MAT-001', description:'Steel Lattice Tower 30m', uom:'Set', issuedQty:4, utilisedQty:4, utilisedStatus:'pm_approved', pmApprovedQty:4, returnQty:0, srnQty:0 },
      { id:2, code:'MAT-002', description:'Foundation Concrete M40',  uom:'Cum', issuedQty:80,utilisedQty:75, utilisedStatus:'submitted',   pmApprovedQty:0, returnQty:0, srnQty:0 },
      { id:3, code:'MAT-003', description:'Anchor Bolt Set M36',      uom:'Set', issuedQty:16,utilisedQty:16, utilisedStatus:'pm_approved', pmApprovedQty:16,returnQty:0, srnQty:0 },
    ]
  },
  { projectId:'VE-2025-003', poNo:'PO-2025-003', vendor:'TowerTech Pvt Ltd', pm:'Arun Kumar',
    materials:[
      { id:1, code:'MAT-011', description:'Offshore Tower 40m GI',    uom:'Set', issuedQty:2, utilisedQty:2,  utilisedStatus:'pm_approved', pmApprovedQty:2, returnQty:0, srnQty:0 },
      { id:2, code:'MAT-012', description:'High Tensile Bolts M48',   uom:'Nos', issuedQty:96,utilisedQty:90, utilisedStatus:'pm_approved', pmApprovedQty:90,returnQty:6, srnQty:6 },
    ]
  },
  { projectId:'VE-2025-007', poNo:'PO-2025-007', vendor:'ABC Telecom Services', pm:'Arun Kumar',
    materials:[
      { id:1, code:'MAT-021', description:'Greenfield Tower 25m',     uom:'Set', issuedQty:3, utilisedQty:2,  utilisedStatus:'submitted',   pmApprovedQty:0, returnQty:0, srnQty:0 },
      { id:2, code:'MAT-022', description:'Equipment Shelter 3x3m',   uom:'Nos', issuedQty:3, utilisedQty:2,  utilisedStatus:'pending',     pmApprovedQty:0, returnQty:0, srnQty:0 },
    ]
  },
  { projectId:'VE-2025-015', poNo:'PO-2025-015', vendor:'TowerTech Pvt Ltd', pm:'Arun Kumar',
    materials:[
      { id:1, code:'MAT-031', description:'Metro Tower 35m',          uom:'Set', issuedQty:6, utilisedQty:3,  utilisedStatus:'pending',     pmApprovedQty:0, returnQty:0, srnQty:0 },
      { id:2, code:'MAT-032', description:'Foundation Piling Work',   uom:'Nos', issuedQty:24,utilisedQty:12, utilisedStatus:'pending',     pmApprovedQty:0, returnQty:0, srnQty:0 },
    ]
  },
];

export type UtilisedStatus = 'pending'|'submitted'|'pm_approved'|'pm_rejected';

export interface MaterialItem {
  id: number;
  code: string;
  description: string;
  uom: string;
  issuedQty: number;
  utilisedQty: number | null;
  utilisedStatus: UtilisedStatus;
  pmApprovedQty: number;
  returnQty: number;
  srnQty: number;
  stnQty?: number;
}

export const STATUS_BADGE_COLOR: Record<string,{color:string;bg:string}> = {
  pending:     { color:"#6B7280", bg:"#F9FAFB" },
  submitted:   { color:"#2563EB", bg:"#EFF6FF" },
  pm_approved: { color:"#0D9488", bg:"#F0FDFA" },
  pm_rejected: { color:"#DC2626", bg:"#FEF2F2" },
};
