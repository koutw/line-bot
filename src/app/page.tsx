import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-muted/20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Line Proxy Shop</h1>
        <p className="text-muted-foreground max-w-md">
          A simplified ERP for managing proxy buying orders via LINE integration.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/admin/products">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
