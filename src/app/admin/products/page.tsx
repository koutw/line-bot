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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";

interface ProductVariant {
  size: string;
  price: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  keyword: string;
  variants: ProductVariant[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    keyword: "",
    basePrice: "", // Helper to auto-fill variant prices
    description: "",
  });
  const [variants, setVariants] = useState<{ size: string; price: number }[]>([
    { size: "F", price: 0 }
  ]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleBasePriceChange = (val: string) => {
    setFormData({ ...formData, basePrice: val });
    const price = parseInt(val) || 0;
    // Update all existing variants to this price if they haven't been manually edited? 
    // Or just simple explicit action. Let's just update all for simplicity or when adding new.
    // User requested "Default price same, but editable".
    // Let's update all variants to this new base price for convenience
    setVariants(prev => prev.map(v => ({ ...v, price })));
  };

  const addVariant = () => {
    setVariants([...variants, { size: "", price: parseInt(formData.basePrice) || 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: "size" | "price", value: string) => {
    const newVariants = [...variants];
    if (field === "price") {
      newVariants[index].price = parseInt(value) || 0;
    } else {
      newVariants[index].size = value;
    }
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        keyword: formData.keyword,
        description: formData.description,
        variants: variants.filter(v => v.size.trim() !== ""), // Filter empty sizes
        imageUrl: "", // Not yet implemented
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success("商品已新增！");
      setIsOpen(false);
      fetchProducts();
      // Reset form
      setFormData({ name: "", keyword: "", basePrice: "", description: "" });
      setVariants([{ size: "F", price: 0 }]);
    } catch (error) {
      toast.error("新增商品失敗");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">商品列表</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> 新增商品
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增商品</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">商品名稱</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="keyword">代號 (訂單觸發詞)</Label>
                  <Input
                    id="keyword"
                    value={formData.keyword}
                    onChange={(e) =>
                      setFormData({ ...formData, keyword: e.target.value })
                    }
                    placeholder="e.g. A01"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="basePrice">基本價格 (預設)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  placeholder="輸入後自動套用至所有尺寸"
                />
              </div>

              <div className="space-y-2">
                <Label>尺寸與價格規格</Label>
                {variants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="尺寸 (e.g. S, M)"
                      value={variant.size}
                      onChange={(e) => updateVariant(index, "size", e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="價格"
                      value={variant.price}
                      onChange={(e) => updateVariant(index, "price", e.target.value)}
                      className="w-24"
                      required
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)} disabled={variants.length === 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> 新增尺寸
                </Button>
              </div>

              <Button type="submit" className="w-full">
                新增商品
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代號</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead>價格區間</TableHead>
              <TableHead>尺寸</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const prices = product.variants?.map(v => v.price) || [];
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const maxPrice = prices.length ? Math.max(...prices) : 0;
              const priceDisplay = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} ~ $${maxPrice}`;
              const sizesDisplay = product.variants?.map(v => v.size).join(", ");

              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.keyword}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{priceDisplay}</TableCell>
                  <TableCell>{sizesDisplay}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
