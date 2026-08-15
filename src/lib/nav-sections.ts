import {
  LayoutGrid,
  Users,
  UserPlus,
  Layers,
  Briefcase,
  Settings,
  Wallet,
  AlertCircle,
  Bus,
  HandCoins,
  ScrollText,
  Package,
  ShoppingCart,
  FileCheck,
  CalendarCheck,
  TrendingUp,
  CircleDollarSign,
  FileText,
  History,
  BarChart3,
  SlidersHorizontal,
  MapPin,
  BookOpen,
  ClipboardList,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; tone: string };
export type NavSection = { label: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid, tone: "text-blue-300" }],
  },
  {
    label: "Students",
    items: [
      { href: "/students", label: "All Students", icon: Users, tone: "text-blue-300" },
      { href: "/students/new", label: "New Admission", icon: UserPlus, tone: "text-blue-300" },
      { href: "/standards", label: "Standards & Fee Structure", icon: Layers, tone: "text-blue-300" },
      { href: "/leaving-certificates", label: "Leaving Certificate", icon: ScrollText, tone: "text-blue-300" },
      { href: "/bonafide-certificates", label: "Bonafide Certificate", icon: FileCheck, tone: "text-blue-300" },
    ],
  },
  {
    label: "Examination",
    items: [
      { href: "/subjects", label: "Subjects", icon: BookOpen, tone: "text-pink-300" },
      { href: "/exams/marks", label: "Students Marks", icon: ClipboardList, tone: "text-pink-300" },
      { href: "/exams", label: "Set Exam", icon: CalendarClock, tone: "text-pink-300" },
    ],
  },
  {
    label: "Fees",
    items: [
      { href: "/payments", label: "Payment In", icon: Wallet, tone: "text-emerald-300" },
      { href: "/pending-fees", label: "Pending Fees", icon: AlertCircle, tone: "text-amber-300" },
    ],
  },
  {
    label: "Staff",
    items: [
      { href: "/teachers", label: "Teachers", icon: Briefcase, tone: "text-violet-300" },
      { href: "/teachers/new", label: "Add Teacher", icon: UserPlus, tone: "text-violet-300" },
      { href: "/attendance", label: "Attendance", icon: CalendarCheck, tone: "text-violet-300" },
      { href: "/salary-structure", label: "Salary Structure", icon: TrendingUp, tone: "text-violet-300" },
      { href: "/payroll", label: "Payroll", icon: CircleDollarSign, tone: "text-violet-300" },
      { href: "/advance-payments", label: "Advance Payments", icon: HandCoins, tone: "text-violet-300" },
      { href: "/salary-slips", label: "Salary Slips", icon: FileText, tone: "text-violet-300" },
      { href: "/salary-history", label: "Salary History", icon: History, tone: "text-violet-300" },
      { href: "/payroll-reports", label: "Payroll Reports", icon: BarChart3, tone: "text-violet-300" },
      { href: "/salary-settings", label: "Salary Settings", icon: SlidersHorizontal, tone: "text-violet-300" },
    ],
  },
  {
    label: "Transport",
    items: [
      { href: "/buses", label: "School Bus", icon: Bus, tone: "text-orange-300" },
      { href: "/buses/village-fees", label: "Village Bus Fees", icon: MapPin, tone: "text-orange-300" },
    ],
  },
  {
    label: "Stationary",
    items: [
      { href: "/stationary/items", label: "Stationary Item", icon: Package, tone: "text-teal-300" },
      { href: "/stationary/sales", label: "Stationary Sale", icon: ShoppingCart, tone: "text-teal-300" },
      { href: "/stationary/payments", label: "Payment In", icon: Wallet, tone: "text-teal-300" },
      { href: "/stationary/pending", label: "Pending Stationary", icon: AlertCircle, tone: "text-teal-300" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/settings", label: "Settings", icon: Settings, tone: "text-sidebar-foreground" }],
  },
];

/** Sections whose items can be granted to a staff access account. "Settings" (Access Control) is admin-only. */
export const GRANTABLE_NAV_SECTIONS = NAV_SECTIONS.filter((section) => section.label !== "Settings");

export const ALL_NAV_HREFS = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href));
