"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ShoppingCart, ExternalLink, Store, Zap, Link, Filter, Star } from "lucide-react";

interface CatalogProduct {
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  productUrl: string;
  source: string;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
}

interface CategoryDef {
  id: string;
  label: string;
  source: string;
}

interface RetailerDef {
  id: string;
  name: string;
  color: string;
  status: "api" | "links";
  description: string;
}

const RETAILERS: RetailerDef[] = [
  { id: "pokemontcg", name: "Pokemon TCG", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", status: "api", description: "Full Pokemon card database with market prices" },
  { id: "optcg", name: "One Piece TCG", color: "bg-red-500/20 text-red-400 border-red-500/30", status: "api", description: "One Piece card database with set info" },
  { id: "target", name: "Target", color: "bg-red-500/20 text-red-400 border-red-500/30", status: "api", description: "Live product search with real-time stock" },
  { id: "bestbuy", name: "Best Buy", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", status: "api", description: "Live product search with availability" },
  { id: "ebay", name: "eBay", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", status: "api", description: "Marketplace listings with current prices" },
  { id: "tcgplayer", name: "TCGPlayer", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", status: "api", description: "TCG marketplace prices and listings" },
  { id: "walmart", name: "Walmart", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", status: "links", description: "Quick links to Walmart search" },
  { id: "samsclub", name: "Sam's Club", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", status: "links", description: "Quick links to Sam's Club" },
  { id: "pokemoncenter", name: "Pokemon Center", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", status: "links", description: "Quick links to categories" },
];

const CATEGORIES: CategoryDef[] = [
  { id: "ptcg-latest", label: "Latest Set", source: "pokemontcg" },
  { id: "ptcg-recent", label: "Recent Sets", source: "pokemontcg" },
  { id: "ptcg-sets", label: "All Sets", source: "pokemontcg" },
  { id: "ptcg-rare", label: "Rare & Valuable", source: "pokemontcg" },
  { id: "optcg-latest", label: "Latest Cards", source: "optcg" },
  { id: "optcg-leaders", label: "Leader Cards", source: "optcg" },
  { id: "optcg-all", label: "All Sets", source: "optcg" },
  { id: "tgt-pokemon-cards", label: "Pokemon Cards", source: "target" },
  { id: "tgt-onepiece-cards", label: "One Piece Cards", source: "target" },
  { id: "tgt-pokemon-etb", label: "Pokemon ETBs", source: "target" },
  { id: "tgt-pokemon-toys", label: "Pokemon Toys", source: "target" },
  { id: "tgt-onepiece-figures", label: "One Piece Figures", source: "target" },
  { id: "tgt-tcg-accessories", label: "TCG Accessories", source: "target" },
  { id: "bb-pokemon-cards", label: "Pokemon Cards", source: "bestbuy" },
  { id: "bb-onepiece", label: "One Piece", source: "bestbuy" },
  { id: "bb-pokemon-games", label: "Pokemon Games", source: "bestbuy" },
  { id: "bb-collectibles", label: "Collectibles", source: "bestbuy" },
  { id: "bb-trading-cards", label: "All Trading Cards", source: "bestbuy" },
  { id: "ebay-pokemon-cards", label: "Pokemon Cards", source: "ebay" },
  { id: "ebay-pokemon-sealed", label: "Sealed Products", source: "ebay" },
  { id: "ebay-onepiece-cards", label: "One Piece Cards", source: "ebay" },
  { id: "ebay-pokemon-etb", label: "Pokemon ETBs", source: "ebay" },
  { id: "tcg-pokemon", label: "Pokemon Cards", source: "tcgplayer" },
  { id: "tcg-onepiece", label: "One Piece Cards", source: "tcgplayer" },
  { id: "tcg-sealed", label: "Sealed Products", source: "tcgplayer" },
  { id: "wmt-pokemon", label: "Pokemon Cards", source: "walmart" },
  { id: "wmt-onepiece", label: "One Piece Cards", source: "walmart" },
  { id: "wmt-pokemon-toys", label: "Pokemon Toys", source: "walmart" },
  { id: "sc-pokemon", label: "Pokemon", source: "samsclub" },
  { id: "sc-onepiece", label: "One Piece", source: "samsclub" },
  { id: "pc-tcg", label: "Trading Cards", source: "pokemoncenter" },
  { id: "pc-plush", label: "Plush", source: "pokemoncenter" },
  { id: "pc-figures", label: "Figures", source: "pokemoncenter" },
];

const SEARCH_LINKS: Record<string, { url: string; label: string }> = {
  "wmt-pokemon": { url: "https://www.walmart.com/search?q=pokemon+trading+cards", label: "Pokemon Cards on Walmart" },
  "wmt-onepiece": { url: "https://www.walmart.com/search?q=one+piece+trading+cards", label: "One Piece Cards on Walmart" },
  "wmt-pokemon-toys": { url: "https://www.walmart.com/search?q=pokemon+toys", label: "Pokemon Toys on Walmart" },
  "sc-pokemon": { url: "https://www.samsclub.com/s/pokemon", label: "Pokemon on Sam's Club" },
  "sc-onepiece": { url: "https://www.samsclub.com/s/one+piece", label: "One Piece on Sam's Club" },
  "pc-tcg": { url: "https://www.pokemoncenter.com/category/trading-card-game", label: "Trading Cards" },
  "pc-plush": { url: "https://www.pokemoncenter.com/category/plush", label: "Plush" },
  "pc-figures": { url: "https://www.pokemoncenter.com/category/figures", label: "Figures" },
};

type StockFilter = "all" | "instock" | "outofstock";

export default function BrowseMarket({ onTrack }: { onTrack: (url: string) => Promise<void> }) {
  const [selectedRetailer, setSelectedRetailer] = useState("pokemontcg");
  const [selectedCategory, setSelectedCategory] = useState("ptcg-latest");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [fromCache, setFromCache] = useState(false);

  const retailer = RETAILERS.find((r) => r.id === selectedRetailer)!;
  const retailerCategories = CATEGORIES.filter((c) => c.source === selectedRetailer);
  const isApiRetailer = retailer?.status === "api";

  useEffect(() => {
    const cats = CATEGORIES.filter((c) => c.source === selectedRetailer);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
    setProducts([]);
    setError("");
    setStockFilter("all");
  }, [selectedRetailer]);

  const handleSearch = async () => {
    if (!selectedCategory || !isApiRetailer) return;
    setLoading(true);
    setError("");
    setProducts([]);
    try {
      const res = await fetch(`/api/discover?category=${selectedCategory}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || []);
      setFromCache(data.fromCache || false);
      if (data.products?.length === 0) setError("No products found. The source may be temporarily unavailable.");
    } catch {
      setError("Failed to fetch products. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (product: CatalogProduct) => {
    setTrackingUrl(product.productUrl);
    try { await onTrack(product.productUrl); } catch { /* parent handles */ } finally { setTrackingUrl(null); }
  };

  const filteredProducts = products.filter((p) => {
    if (stockFilter === "instock") return p.inStock;
    if (stockFilter === "outofstock") return !p.inStock;
    return true;
  });

  const inStockCount = products.filter((p) => p.inStock).length;
  const outOfStockCount = products.filter((p) => !p.inStock).length;

  return (
    <div>
      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">6</p>
          <p className="text-zinc-500 text-xs">Live Sources</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">9</p>
          <p className="text-zinc-500 text-xs">Total Retailers</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{inStockCount}</p>
          <p className="text-zinc-500 text-xs">In Stock</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-zinc-400">{products.length}</p>
          <p className="text-zinc-500 text-xs">Products Found</p>
        </div>
      </div>

      {/* Retailer Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {RETAILERS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRetailer(r.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              selectedRetailer === r.id
                ? r.color + " border-current"
                : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            {r.status === "api" ? <Zap size={12} /> : <Link size={12} />}
            {r.name}
            {r.status === "api" && (
              <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded ml-0.5">LIVE</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-zinc-500 text-xs mb-4">{retailer?.description}</p>

      {isApiRetailer && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              {retailerCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <button onClick={handleSearch} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 transition-all text-sm">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Searching...</> : <><Search size={14} /> Browse Products</>}
            </button>
            {fromCache && <span className="text-zinc-600 text-xs">cached</span>}
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {products.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400 text-sm">{filteredProducts.length} of {products.length} products</p>
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-zinc-500" />
                {(["all", "instock", "outofstock"] as const).map((f) => (
                  <button key={f} onClick={() => setStockFilter(f)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      stockFilter === f
                        ? f === "instock" ? "bg-green-500/20 text-green-400" : f === "outofstock" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}>
                    {f === "all" ? "All" : f === "instock" ? `In Stock (${inStockCount})` : `OOS (${outOfStockCount})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product, i) => (
                <div key={`${product.productUrl}-${i}`}
                  className={`rounded-xl border overflow-hidden transition-all hover:border-zinc-600 ${
                    product.inStock ? "border-green-600/30 bg-green-950/10" : "border-zinc-700 bg-zinc-900/50"
                  }`}>
                  <div className="p-4">
                    <div className="w-full h-36 bg-zinc-800 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-zinc-600 text-xs">No Image</div>
                      )}
                    </div>
                    {product.category && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 mb-1.5">{product.category}</span>
                    )}
                    <h3 className="text-white font-medium text-xs leading-tight mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-white">
                        {product.price !== null ? `$${product.price.toFixed(2)}` : "\u2014"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        product.inStock ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    {product.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-zinc-400">{product.rating.toFixed(1)}{product.reviewCount ? ` (${product.reviewCount})` : ""}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleTrack(product)} disabled={trackingUrl === product.productUrl}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50 transition-colors">
                        {trackingUrl === product.productUrl ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                        Track
                      </button>
                      <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && !error && (
            <div className="text-center py-12">
              <Search size={40} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">Select a category and click &quot;Browse Products&quot; to search.</p>
              <p className="text-zinc-600 text-xs mt-2">Now with 6 live data sources!</p>
            </div>
          )}
        </>
      )}

      {!isApiRetailer && (
        <div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-4">
            <p className="text-zinc-400 text-xs mb-1">
              <Store size={12} className="inline mr-1" />
              {retailer.name} blocks automated product fetching. Use the links below to browse directly.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {retailerCategories.map((cat) => {
              const link = SEARCH_LINKS[cat.id];
              if (!link) return null;
              return (
                <a key={cat.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group">
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-sm group-hover:text-yellow-400 transition-colors">{cat.label}</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">{link.label}</p>
                  </div>
                  <ExternalLink size={16} className="text-zinc-600 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
