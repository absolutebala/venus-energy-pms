// components/Icon.tsx — Simple icon wrapper for Venus Energy PMS
// Usage: <Icon name="check" size={16} color="#0D9488" />
import React from 'react';
import {
  LayoutDashboard, FolderOpen, Building2, Package, Wallet,
  FileText, BarChart3, Shield, User, Users, Lock,
  CheckCircle2, Clock, XCircle, AlertTriangle, Activity,
  Flag, CreditCard, ClipboardList, Search, Bell,
  Trash2, Edit2, Save, Upload, Download, RefreshCw,
  Calendar, TrendingUp, Plus, ChevronRight, ChevronDown,
  Eye, EyeOff, Filter, MoreHorizontal, MapPin,
  Phone, Mail, Info, BadgeCheck, AlertCircle,
  DollarSign, Receipt, Banknote, Boxes, Box,
  FileCheck, FileX, FileClock, Key,
  ShieldCheck, ShieldAlert, HardHat, Wrench,
  Star, Tag, Settings, LogOut, ExternalLink,
  BarChart2, PieChart, Zap, ArrowUpRight,
} from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  // Navigation
  dashboard:    LayoutDashboard,
  projects:     FolderOpen,
  vendors:      Building2,
  package:      Package,
  wallet:       Wallet,
  invoice:      FileText,
  reports:      BarChart3,
  shield:       Shield,
  user:         User,
  users:        Users,
  lock:         Lock,
  key:          Key,
  settings:     Settings,
  // Status
  check:        CheckCircle2,
  clock:        Clock,
  x:            XCircle,
  warning:      AlertTriangle,
  activity:     Activity,
  badge:        BadgeCheck,
  alert:        AlertCircle,
  flag:         Flag,
  zap:          Zap,
  // Actions
  edit:         Edit2,
  trash:        Trash2,
  save:         Save,
  upload:       Upload,
  download:     Download,
  refresh:      RefreshCw,
  search:       Search,
  plus:         Plus,
  eye:          Eye,
  filter:       Filter,
  more:         MoreHorizontal,
  external:     ExternalLink,
  logout:       LogOut,
  // Finance
  dollar:       DollarSign,
  receipt:      Receipt,
  credit:       CreditCard,
  banknote:     Banknote,
  // Misc
  calendar:     Calendar,
  trend:        TrendingUp,
  map:          MapPin,
  phone:        Phone,
  mail:         Mail,
  info:         Info,
  boxes:        Boxes,
  box:          Box,
  clipboard:    ClipboardList,
  bell:         Bell,
  star:         Star,
  tag:          Tag,
  hardhat:      HardHat,
  wrench:       Wrench,
  filedone:     FileCheck,
  fileclock:    FileClock,
  filex:        FileX,
  bar:          BarChart2,
  pie:          PieChart,
  arrow:        ArrowUpRight,
  chevron:      ChevronRight,
  down:         ChevronDown,
  shieldcheck:  ShieldCheck,
  shieldalert:  ShieldAlert,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size=16, color, strokeWidth=1.75, className, style }: IconProps) {
  const Component = ICONS[name] || Info;
  return <Component size={size} color={color} strokeWidth={strokeWidth} className={className} style={style} />;
}
