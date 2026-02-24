"use client";

import { Trash2, ExternalLink, RefreshCw } from "lucide-react";

interface Product {
  id: string;
  url: string;
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  source: string;
  lastChecked: string | null;
  previouslyInStock: boolean;
}

const SOURCE_STYLES: Record<string, { label: string; color: string }> = {
  pokemontcg: { label: "Pokemon TCG", color: "bg-yellow-500/20 text-yellow-400" },
  optcg: { label: "One Piece TCG", color: "bg-red-500/20 text-red-400" },
  pokemoncenter: { label: "Pokemon Center", color: "bg-amber-500/20 text-amber-400" },
  target: { label: "Target", color: "bg-red-500/20 text-red-400" },
  walmart: { label: "Walmart", color: "bg-blue-500/20 text-blue-400" },
  bestbuy: { label: "Best Buy", color: "bg-yellow-500/20 text-yellow-300" },
  samsclub: { label: "Sam's Club", color: "bg-sky-500/20 text-sky-400" },
  ebay: { label: "eBay", color: "bg-blue-500/20 text-blue-400" },
  tcgplayer: { label: "TCGPlayer", color: "bg-orange-500/20 text-orange-400" },
  amazon: { label: "Amazon", color: "bg-orange-500/20 text-orange-300" },
};

export default function ProductCard({
  product,
  onRemove,
}: {
  product: Product;
  onRemove: (id: string) => void;
}) {
  const isRestock = product.inStock && !product.previouslyInStock;
  const style = SOURCE_STYLES[product.source] || { label: product.source, color: "bg-zinc-500/20 text-zinc-400" };

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 ${
        isRestock
          ? "border-green-400 shadow-lg shadow-green-400/20 animate-pulse-slow"
          : product.inStock
            ? "border-green-600/50 bg-green-950/20"
            : "border-zinc-700 bg-zinc-900/50"
      }`}
    >
      {isRestock && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-black text-xs font-bold text-center py-1 z-10">
          BACK IN STOCK!
        </div>
      )}

      <div className={`p-4 ${isRestock ? "pt-8" : ""}`}>
        <div className="w-full h-48 bg-zinc-800 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="text-zinc-600 text-sm">No Image</div>
          )}
        </div>

        <div className="mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.color}`}>
            {style.label}
          </span>
        </div>

        <h3 className="text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-white">
            {product.price !== null ? `$${product.price.toFixed(2)}` : "N/A"}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold ${
              product.inStock ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {product.lastChecked && (
          <div className="flex items-center gap-1 text-zinc-500 text-xs mb-3">
            <RefreshCw size={10} />
            <span>{new Date(product.lastChecked).toLocaleTimeString()}</span>
          </div>
        )}

        <div className="flex gap-2">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink size={12} />
            View Product
          </a>
          <button
            onClick={() => onRemove(product.id)}
            className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-800 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
