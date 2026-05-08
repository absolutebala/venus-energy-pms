import { UserRole } from '@/types';

export const TEAM_MEMBERS: {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole | 'accounting_team';
  region: string;
  designation: string;
  is_active: boolean;
}[] = [
  { id:'TM-001', full_name:'Ramesh Kumar', email:'ramesh@venusenergy.com', phone:'9876543210', role:'region_manager',  region:'Tamil Nadu',    designation:'Regional Manager',   is_active:true  },
  { id:'TM-002', full_name:'Amit Sharma',  email:'amit@venusenergy.com',   phone:'9876543211', role:'region_manager',  region:'Maharashtra',   designation:'Regional Manager',   is_active:true  },
  { id:'TM-003', full_name:'Arun Kumar',   email:'arun@venusenergy.com',   phone:'9876543212', role:'project_manager', region:'Tamil Nadu',    designation:'Project Manager',    is_active:true  },
  { id:'TM-004', full_name:'Vijay Kumar',  email:'vijay@venusenergy.com',  phone:'9876543213', role:'project_manager', region:'Telangana',     designation:'Project Manager',    is_active:true  },
  { id:'TM-005', full_name:'Priya Sharma', email:'priya@venusenergy.com',  phone:'9876543214', role:'project_manager', region:'Karnataka',     designation:'Project Manager',    is_active:true  },
  { id:'TM-006', full_name:'Pooja Mehta',  email:'pooja@venusenergy.com',  phone:'9876543215', role:'project_manager', region:'Maharashtra',   designation:'Project Manager',    is_active:true  },
  { id:'TM-007', full_name:'Suresh Patel', email:'suresh@venusenergy.com', phone:'9876543216', role:'site_engineer',  region:'Tamil Nadu',    designation:'Site Engineer',      is_active:true  },
  { id:'TM-008', full_name:'Rajeev Singh', email:'rajeev@venusenergy.com', phone:'9876543217', role:'site_engineer',  region:'Delhi',         designation:'Site Engineer',      is_active:true  },
  { id:'TM-009', full_name:'Neha Verma',   email:'neha@venusenergy.com',   phone:'9876543218', role:'viewer',         region:'West Bengal',   designation:'Operations Lead',    is_active:true  },
  { id:'TM-010', full_name:'Deepak Nair',  email:'deepak@venusenergy.com', phone:'9876543219', role:'accounting_team',region:'Head Office',   designation:'Accounts Executive', is_active:false },
];
