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
import { Download, Trash2, Truck, CheckCircle, PackageCheck, AlertCircle, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  user: { name: string | null; lineId: string };
  product: { name: string; keyword: string };
  quantity: number;
  totalAmount: number;
  status: string;
  deleteReason?: string;
  createdAt: string;
}

interface Product {
  id: string;
  keyword: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "已確認", color: "bg-green-200 text-green-800", icon: CheckCircle },
  { value: "SHIPPING", label: "出貨中", color: "bg-yellow-200 text-yellow-800", icon: Truck },
  { value: "ARRIVED", label: "已到貨", color: "bg-green-600 text-white", icon: PackageCheck },
  { value: "DELETED", label: "已刪除", color: "bg-red-200 text-red-800", icon: Trash2 },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  // Filters
  const [filterKeyword, setFilterKeyword] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<string[]>(["CONFIRMED"]);

  // Inline Edit Popover State (track open popover ID to ensure only one opens - simpler to let Popover handle it per row)

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  const fetchOrders = async () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("startDate", dateRange.start);
    if (dateRange.end) params.append("endDate", dateRange.end);
    params.append("sort", sortConfig.key);
    params.append("order", sortConfig.direction);

    if (filterKeyword && filterKeyword !== "all") params.append("keyword", filterKeyword);
    if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);

    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [dateRange, sortConfig, filterKeyword, filterStatus]);

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter((s) => s !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleBatchStatus = async (status: string) => {
    if (selectedOrders.length === 0) return;

    if (status === "DELETED") {
      setIsDeleteOpen(true);
      return;
    }

    await updateStatus(selectedOrders, status);
  };

  const handleDeleteConfirm = async () => {
    await updateStatus(selectedOrders, "DELETED", deleteReason);
    setIsDeleteOpen(false);
    setDeleteReason("");
  };

  const updateStatus = async (ids: string[], status: string, reason?: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status, deleteReason: reason }),
      });

      if (res.ok) {
        toast.success(`已更新 ${ids.length} 筆訂單狀態`);
        fetchOrders(); // Refresh list to reflect changes
        setSelectedOrders([]);
      } else {
        toast.error("更新失敗");
      }
    } catch (e) {
      toast.error("發生錯誤");
    }
  };

  const handleSingleStatusUpdate = async (id: string, status: string) => {
    // Direct update for single item inline
    await updateStatus([id], status);
    // Ensure popover closes (it should automatically on click usually, or we verify)
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("startDate", dateRange.start);
    if (dateRange.end) params.append("endDate", dateRange.end);
    if (exportStatuses.length > 0) params.append("status", exportStatuses.join(","));
    if (filterKeyword && filterKeyword !== "all") params.append("keyword", filterKeyword);

    window.open(`/api/orders/export?${params.toString()}`, "_blank");
    setIsExportOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge className={cn("font-normal border-0", option?.color || "bg-gray-200 text-gray-800")}>
        {option?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">訂單記錄</h2>
        <div className="flex flex-wrap items-end gap-2">
          {selectedOrders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  批次更新狀態 ({selectedOrders.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => handleBatchStatus(option.value)}>
                    <option.icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex flex-col gap-1 w-[130px]">
            <Label className="text-xs">商品代碼</Label>
            <Select value={filterKeyword} onValueChange={setFilterKeyword}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.keyword}>
                    {p.keyword} - {p.name.slice(0, 10)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-[130px]">
            <Label className="text-xs">狀態篩選</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">開始日期</Label>
            <Input
              type="date"
              className="w-[130px] h-8 text-xs"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">結束日期</Label>
            <Input
              type="date"
              className="w-[130px] h-8 text-xs"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>

          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                匯出 CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>匯出訂單</DialogTitle>
                <DialogDescription>選擇要匯出的訂單狀態</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 py-4">
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`export-${option.value}`}
                      checked={exportStatuses.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setExportStatuses([...exportStatuses, option.value]);
                        else setExportStatuses(exportStatuses.filter(s => s !== option.value));
                      }}
                    />
                    <Label htmlFor={`export-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={handleExport}>確認匯出</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={orders.length > 0 && selectedOrders.length === orders.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>
                日期 {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>客戶</TableHead>
              <TableHead>商品</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("quantity")}>
                數量 {sortConfig.key === "quantity" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("totalAmount")}>
                總金額 {sortConfig.key === "totalAmount" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  目前沒有訂單記錄。
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className={order.status === "DELETED" ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => toggleSelect(order.id)}
                    />
                  </TableCell>
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
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(order.status)}
                      {order.deleteReason && (
                        <div className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {order.deleteReason}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-0" align="end">
                        <div className="grid gap-1 p-1">
                          {STATUS_OPTIONS.map((status) => (
                            <Button
                              key={status.value}
                              variant="ghost"
                              className="justify-start h-8 text-xs font-normal"
                              onClick={() => handleSingleStatusUpdate(order.id, status.value)}
                            >
                              <status.icon className="mr-2 h-3 w-3" />
                              {status.label}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除確認</DialogTitle>
            <DialogDescription>
              您確定要刪除選取的 {selectedOrders.length} 筆訂單嗎？此操作將標記訂單為「已刪除」。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>刪除原因 (選填)</Label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="例如：客戶取消、重複下單..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>確認刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
