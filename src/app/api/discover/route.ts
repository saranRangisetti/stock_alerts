import { NextRequest, NextResponse } from "next/server";
import { discoverProducts, getCategoriesForSource, CATEGORIES, type RetailerSource } from "@/lib/catalog-scraper";
import { getCache, setCache } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category");
  const source = searchParams.get("source") as RetailerSource | null;

  if (categoryId) {
    const cacheKey = `discover:${categoryId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ products: cached, fromCache: true });
    }

    const products = await discoverProducts(categoryId);
    if (products.length > 0) {
      await setCache(cacheKey, products);
    }
    return NextResponse.json({ products, fromCache: false });
  }

  if (source) {
    const categories = getCategoriesForSource(source);
    const cacheKey = `discover:source:${source}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ products: cached, fromCache: true });
    }

    const results = await Promise.allSettled(
      categories.map((c) => discoverProducts(c.id)),
    );

    const products = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    const seen = new Set<string>();
    const unique = products.filter((p) => {
      if (seen.has(p.productUrl)) return false;
      seen.add(p.productUrl);
      return true;
    });

    if (unique.length > 0) {
      await setCache(cacheKey, unique);
    }
    return NextResponse.json({ products: unique, fromCache: false });
  }

  return NextResponse.json({ categories: CATEGORIES });
}
