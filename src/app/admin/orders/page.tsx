"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

interface Order {
  id: string;
  user: { name: string | null; lineId: string };
  product: { name: string; price: number; keyword: string };
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const fetchOrders = async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("startDate", dateRange.start);
    if (dateRange.end) params.append("endDate", dateRange.end);

    // Open in new tab to trigger download
    window.open(`/api/orders/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">訂單記錄</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">開始日期</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">結束日期</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            匯出 CSV
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>客戶</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>數量</TableHead>
              <TableHead>總金額</TableHead>
              <TableHead>狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  目前沒有訂單記錄。
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.user.name || "未知"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                      {order.user.lineId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {order.product.keyword}
                      </Badge>
                      <span>{order.product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>${order.totalAmount}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === "CONFIRMED" ? "default" : "outline"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
