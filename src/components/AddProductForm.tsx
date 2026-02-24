"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export default function AddProductForm({
  onAdd,
}: {
  onAdd: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      await onAdd(url.trim());
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="Paste a product URL from any supported retailer..."
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-sm"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus size={16} />
              Track Product
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      <p className="mt-2 text-zinc-600 text-xs">
        Supported: target.com, bestbuy.com, ebay.com, tcgplayer.com, walmart.com, pokemoncenter.com, samsclub.com, amazon.com
      </p>
    </form>
  );
}
