"use client";

import { useState, useEffect } from "react";
import { Newspaper, Loader2, ExternalLink, Rocket, RefreshCw, Tag } from "lucide-react";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  date: string;
  source: string;
  imageUrl: string | null;
  type: "launch" | "restock" | "news" | "deal";
}

const TYPE_STYLES = {
  launch: { label: "New Launch", icon: Rocket, color: "bg-purple-500/20 text-purple-400" },
  restock: { label: "Restock", icon: RefreshCw, color: "bg-green-500/20 text-green-400" },
  news: { label: "News", icon: Newspaper, color: "bg-blue-500/20 text-blue-400" },
  deal: { label: "Deal", icon: Tag, color: "bg-yellow-500/20 text-yellow-400" },
};

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "launch" | "restock" | "news" | "deal">("all");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      setNews(data.news || []);
    } catch {
      console.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all" ? news : news.filter((n) => n.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "launch", "restock", "deal", "news"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === type
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            {type === "all" ? "All" : TYPE_STYLES[type].label}
            {type !== "all" && (
              <span className="ml-1.5 text-zinc-500">
                ({news.filter((n) => n.type === type).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">No news articles found. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, i) => {
            const typeStyle = TYPE_STYLES[item.type];
            const Icon = typeStyle.icon;
            return (
              <a
                key={`${item.url}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
              >
                {/* Image */}
                {item.imageUrl && (
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${typeStyle.color}`}>
                      <Icon size={10} />
                      {typeStyle.label}
                    </span>
                    <span className="text-zinc-600 text-[10px]">{item.source}</span>
                    {item.date && <span className="text-zinc-600 text-[10px]">{item.date}</span>}
                  </div>
                  <h3 className="text-white font-medium text-sm leading-snug mb-1 group-hover:text-yellow-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{item.description}</p>
                  )}
                </div>

                <ExternalLink size={14} className="text-zinc-600 flex-shrink-0 mt-1 group-hover:text-zinc-400 transition-colors" />
              </a>
            );
          })}
        </div>
      )}

      {/* Reddit Tips Section */}
      <div className="mt-8 p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Tag size={14} className="text-yellow-400" />
          MSRP Buying Tips (from the community)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400">
          <div className="space-y-2">
            <p><span className="text-yellow-400 font-medium">Target:</span> Restocks Fridays ~8AM. Also check Mon/Wed.</p>
            <p><span className="text-blue-400 font-medium">Walmart:</span> Thursdays 7-10AM. "Walmart Wednesday" for online drops.</p>
            <p><span className="text-yellow-300 font-medium">Best Buy:</span> Reservation system for hot items. Varies by release.</p>
          </div>
          <div className="space-y-2">
            <p><span className="text-yellow-400 font-medium">Pokemon Center:</span> Drops 7AM-12PM PST weekdays. Enter queue within 5-10 min.</p>
            <p><span className="text-sky-400 font-medium">Sam&apos;s Club:</span> Exclusive bundles at competitive pricing. Membership required.</p>
            <p><span className="text-zinc-300 font-medium">Pro tip:</span> Join r/PKMNTCGDeals Discord for instant restock alerts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
