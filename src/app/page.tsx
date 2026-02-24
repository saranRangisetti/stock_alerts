"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Package, Bell, Zap, Search, Newspaper, ShoppingCart, Settings } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import AddProductForm from "@/components/AddProductForm";
import AlertBanner from "@/components/AlertBanner";
import BrowseMarket from "@/components/BrowseMarket";
import NewsFeed from "@/components/NewsFeed";
import EmailSettings from "@/components/EmailSettings";

interface Product {
  id: string;
  url: string;
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  source: string;
  lastChecked: string | null;
  addedAt: string;
  previouslyInStock: boolean;
}

type Tab = "browse" | "tracked" | "news" | "settings";

const POLL_INTERVAL = 60000;

export default function Home() {
  const [tab, setTab] = useState<Tab>("browse");
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/scrape");
      const data = await res.json();
      if (data.products) setProducts(data.products);
      if (data.alerts?.length > 0) {
        setAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newAlerts = data.alerts.filter(
            (a: Product) => !existingIds.has(a.id),
          );
          return [...prev, ...newAlerts];
        });
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (products.length === 0) return;
    const interval = setInterval(refreshPrices, POLL_INTERVAL);
    refreshPrices();
    return () => clearInterval(interval);
  }, [products.length, refreshPrices]);

  const handleAddProduct = async (url: string) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add product");
    }

    await fetchProducts();
    // Stay on current tab, just update the products list
  };

  const handleRemoveProduct = async (id: string) => {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDismissAlert = async (id: string) => {
    await fetch(`/api/products?id=${id}&action=clear-alert`, {
      method: "DELETE",
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const inStockCount = products.filter((p) => p.inStock).length;

  const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "browse", label: "Browse Market", icon: Search },
    { id: "tracked", label: `My Tracked (${products.length})`, icon: ShoppingCart },
    { id: "news", label: "News & Launches", icon: Newspaper },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AlertBanner
        alerts={alerts.map((a) => ({
          id: a.id,
          name: a.name,
          source: a.source,
          url: a.url,
        }))}
        onDismiss={handleDismissAlert}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <Zap size={28} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Inventory Alerts</h1>
              <p className="text-zinc-500 text-sm">
                Pokemon & One Piece MSRP Restock Tracker
              </p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex gap-1 mb-6 border-b border-zinc-800 pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-[2px] ${
                tab === id
                  ? "text-yellow-400 border-yellow-400 bg-yellow-500/5"
                  : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {/* Browse Market Tab */}
        {tab === "browse" && <BrowseMarket onTrack={handleAddProduct} />}

        {/* Tracked Products Tab */}
        {tab === "tracked" && (
          <div>
            {/* Add Product Form */}
            <section className="mb-6">
              <AddProductForm onAdd={handleAddProduct} />
            </section>

            {/* Stats Bar */}
            <section className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Package size={16} />
                <span>
                  {products.length} product{products.length !== 1 ? "s" : ""} tracked
                </span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Bell size={16} />
                <span>{inStockCount} in stock</span>
              </div>
              <div className="flex-1" />
              <button
                onClick={refreshPrices}
                disabled={refreshing}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                <span>{refreshing ? "Checking..." : "Refresh"}</span>
              </button>
              {lastRefresh && (
                <span className="text-zinc-600 text-xs">
                  Last: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </section>

            {/* Product Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw size={24} className="animate-spin text-zinc-500" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Package size={48} className="mx-auto text-zinc-700 mb-4" />
                <h2 className="text-xl font-semibold text-zinc-400 mb-2">
                  No products tracked yet
                </h2>
                <p className="text-zinc-600 max-w-md mx-auto">
                  Browse the market to discover products, or paste a product URL above.
                  You&apos;ll get sound + visual alerts when tracked items restock at MSRP.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onRemove={handleRemoveProduct}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* News Tab */}
        {tab === "news" && <NewsFeed />}

        {/* Settings Tab */}
        {tab === "settings" && <EmailSettings />}
      </div>
    </div>
  );
}
