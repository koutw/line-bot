import Link from "next/link";
import Image from "next/image";
import { Package, ShoppingCart, Users, PanelLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-4 text-lg font-semibold">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" />
            </div>
            <span className="text-base">MyBoo｜韓國寵物選品店</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-2 p-4 text-sm font-medium">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Package className="h-4 w-4" />
            商品管理
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            訂單管理
          </Link>
          <Link
            href="/admin/customers"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Users className="h-4 w-4" />
            會員管理
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            系統設定
          </Link>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64 w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-full">
                    <Image src="/logo.png" alt="Logo" fill className="object-cover" />
                  </div>
                  <span className="text-base">MyBoo｜韓國寵物選品店</span>
                </Link>
                <Link
                  href="/admin/products"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Package className="h-5 w-5" />
                  商品管理
                </Link>
                <Link
                  href="/admin/orders"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                  訂單管理
                </Link>
                <Link
                  href="/admin/customers"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  會員管理
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </header>
        <main className="p-4 sm:px-6 sm:py-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
