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
  { value: "CONFIRMED", label: "已確認", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "PURCHASED", label: "已採買", color: "bg-blue-100 text-blue-800", icon: PackageCheck },
  { value: "OUT_OF_STOCK", label: "斷貨", color: "bg-red-100 text-red-800", icon: AlertCircle },
  { value: "CANCELLED", label: "客人取消", color: "bg-gray-200 text-gray-800", icon: Trash2 },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"CURRENT" | "HISTORY">("CURRENT");
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

  const TAB_STATUSES = {
    CURRENT: ["PENDING", "CONFIRMED", "PURCHASED", "SHIPPING", "ARRIVED", "OUT_OF_STOCK"],
    HISTORY: ["CANCELLED", "COMPLETED"],
  };

  const STATUS_OPTIONS = [
    { value: "PENDING", label: "待確認", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
    { value: "CONFIRMED", label: "已確認", color: "bg-green-100 text-green-800", icon: CheckCircle },
    { value: "PURCHASED", label: "已採買", color: "bg-blue-100 text-blue-800", icon: PackageCheck },
    { value: "SHIPPING", label: "運送中", color: "bg-purple-100 text-purple-800", icon: Truck },
    { value: "ARRIVED", label: "已抵台", color: "bg-orange-100 text-orange-800", icon: CheckCircle },
    { value: "OUT_OF_STOCK", label: "斷貨", color: "bg-red-100 text-red-800", icon: AlertCircle },
    { value: "COMPLETED", label: "已完成", color: "bg-slate-100 text-slate-800", icon: CheckCircle },
    { value: "CANCELLED", label: "已取消", color: "bg-gray-200 text-gray-800", icon: Trash2 },
  ];

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchOrders = async () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("startDate", dateRange.start);
    if (dateRange.end) params.append("endDate", dateRange.end);
    params.append("sort", sortConfig.key);
    params.append("order", sortConfig.direction);

    if (filterKeyword && filterKeyword !== "all") params.append("keyword", filterKeyword);

    // Filter Logic
    if (filterStatus && filterStatus !== "all") {
      params.append("status", filterStatus);
    } else {
      // If "all", fetch all statuses valid for the current TAB
      const validStatuses = TAB_STATUSES[activeTab];
      params.append("status", validStatuses.join(","));
    }

    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setSelectedOrders([]); // Clear selection on fetch
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [dateRange, sortConfig, filterKeyword, filterStatus, activeTab]);

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

    if (status === "CANCELLED" && activeTab === "CURRENT") {
      // Moving to history (soft delete/cancel)
      setIsDeleteOpen(true);
      return;
    }

    // For "Delete" in History tab
    if (activeTab === "HISTORY" && status === "DELETE") {
      if (!confirm(`確定要永久刪除選取的 ${selectedOrders.length} 筆訂單嗎？`)) return;
      // API for hard delete orders? PATCH status?
      // Current API uses PATCH status. We need a DELETE method or status="DELETED" which actually deletes?
      // Admin requirements said "History can be deleted". 
      // Currently backend PATCH implies update status. 
      // I should probably add a DELETE method to api/orders OR treat "DELETED" status as hard delete logic in backend?
      // Wait, backend logic for PATCH status='DELETED' is only updating status to 'DELETED' (if enum allows) or it's not implementing real delete?
      // Looking at api/orders/route.ts, PATCH updates status.
      // Product logic implements real DELETE.
      // Order logic should implement real DELETE for cleanup.
      // However, `api/orders` doesn't have DELETE method yet.
      // I should rely on "CANCELLED" as the "move to history".
      // And "Delete" button in History should call a real DELETE. 
      // Since I didn't update api/orders DELETE yet, I'll temporarily use PATCH status="CANCELLED" as the "Delete" from Current.
      // For History Tab "Delete", I need a DELETE endpoint. 
      // OR I can use `status="DELETED"` and filter it out?
      // The requirement is "Safe deletion of only historical items". 
      // So I should implement DELETE in api/orders/route.ts.
      // For now, let's assume I will add DELETE to api/orders/route.ts next.
      // I will stick to calling DELETE method here.
      try {
        const res = await fetch("/api/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedOrders }),
        });
        if (res.ok) {
          toast.success("永久刪除成功");
          fetchOrders();
        } else {
          toast.error("刪除失敗");
        }
      } catch (e) { toast.error("刪除失敗"); }
      return;
    }

    await updateStatus(selectedOrders, status);
  };

  const handleDeleteConfirm = async () => {
    // This is for "Cancelling" orders (moving to history) with reason
    await updateStatus(selectedOrders, "CANCELLED", deleteReason);
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
    if (status === "CANCELLED") {
      setSelectedOrders([id]);
      setIsDeleteOpen(true);
      return;
    }
    await updateStatus([id], status);
  };

  const handleSingleDelete = async (id: string) => {
    if (!confirm("確定要永久刪除此訂單嗎？")) return;
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE", // We need to add this
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        toast.success("已刪除");
        fetchOrders();
      } else {
        toast.error("刪除失敗");
      }
    } catch (e) { toast.error("刪除失敗"); }
  }

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

  const currentTabOptions = STATUS_OPTIONS.filter(o => TAB_STATUSES[activeTab].includes(o.value));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">訂單記錄</h2>

        {/* Custom Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === "CURRENT" ? "default" : "ghost"}
            onClick={() => { setActiveTab("CURRENT"); setFilterStatus("all"); }}
          >
            目前訂單 (Current)
          </Button>
          <Button
            variant={activeTab === "HISTORY" ? "default" : "ghost"}
            onClick={() => { setActiveTab("HISTORY"); setFilterStatus("all"); }}
          >
            歷史訂單 (History)
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-end gap-2">
            {selectedOrders.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={activeTab === "HISTORY" ? "destructive" : "outline"} size="sm">
                    {activeTab === "HISTORY" ? "批次刪除" : "批次更新狀態"} ({selectedOrders.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {activeTab === "CURRENT" ? (
                    // Current Tab Actions
                    STATUS_OPTIONS.filter(o => TAB_STATUSES.CURRENT.includes(o.value) || o.value === "COMPLETED" || o.value === "CANCELLED").map((option) => (
                      <DropdownMenuItem key={option.value} onClick={() => handleBatchStatus(option.value)}>
                        <option.icon className="mr-2 h-4 w-4" />
                        {option.label}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    // History Tab Actions
                    <DropdownMenuItem onClick={() => handleBatchStatus("DELETE")}>
                      <Trash2 className="mr-2 h-4 w-4" /> 永久刪除
                    </DropdownMenuItem>
                  )}
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
                  {currentTabOptions.map((status) => (
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
                  {activeTab === "CURRENT" ? "目前沒有處理中的訂單。" : "沒有歷史訂單。"}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className={order.status === "CANCELLED" ? "opacity-50" : ""}>
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
                    {activeTab === "CURRENT" ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-0" align="end">
                          <div className="grid gap-1 p-1">
                            {STATUS_OPTIONS.filter(o => o.value !== "PENDING").map((status) => (
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
                    ) : (
                      // HISTORY ACTIONS
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleSingleDelete(order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
            <DialogTitle>取消訂單確認</DialogTitle>
            <DialogDescription>
              您確定要取消選取的 {selectedOrders.length} 筆訂單嗎？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>取消原因 (選填)</Label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="例如：客戶取消、重複下單..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>返回</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>確認取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
