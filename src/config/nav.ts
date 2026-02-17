
import { Package, ShoppingCart, Users, Settings } from "lucide-react";

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const adminNavItems: SidebarNavItem[] = [
  {
    title: "商品管理",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "訂單管理",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "會員管理",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "系統設定",
    href: "/admin/settings",
    icon: Settings,
  },
];
