"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const [orderingEnabled, setOrderingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setOrderingEnabled(data.value);
        setLoading(false);
      });
  }, []);

  const toggleOrdering = async (checked: boolean) => {
    setOrderingEnabled(checked);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: checked }),
    });
    if (res.ok) {
      if (checked) toast.success("已開啟連線下單功能");
      else toast.info("已關閉連線下單功能");
    } else {
      toast.error("設定更新失敗");
      setOrderingEnabled(!checked); // revert
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">系統設定</h2>

      <Card>
        <CardHeader>
          <CardTitle>連線狀態設定</CardTitle>
          <CardDescription>
            控制是否開放使用者透過 LINE 下單。關閉時，機器人將回覆「目前非連線時間」。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Switch
            id="ordering-mode"
            checked={orderingEnabled}
            onCheckedChange={toggleOrdering}
          />
          <Label htmlFor="ordering-mode" className="text-lg">
            {orderingEnabled ? "🟢 連線中 (開放下單)" : "🔴 休止中 (暫停下單)"}
          </Label>
        </CardContent>
      </Card>
    </div>
  );
}
