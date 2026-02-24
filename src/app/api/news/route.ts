import { NextResponse } from "next/server";
import { scrapeNews } from "@/lib/catalog-scraper";
import { getCache, setCache } from "@/lib/storage";

export async function GET() {
  const cacheKey = "news:all";
  const cached = getCache(cacheKey);
  if (cached) {
    return NextResponse.json({ news: cached, fromCache: true });
  }

  const news = await scrapeNews();
  if (news.length > 0) {
    setCache(cacheKey, news);
  }
  return NextResponse.json({ news, fromCache: false });
}
