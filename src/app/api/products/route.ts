import { NextRequest, NextResponse } from "next/server";
import {
  getProductsAsync,
  addProduct,
  removeProduct,
  clearAlert,
} from "@/lib/storage";
import { scrapeProduct, isSupportedUrl } from "@/lib/scraper";

export async function GET() {
  const products = await getProductsAsync();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const trimmedUrl = url.trim();

  if (!isSupportedUrl(trimmedUrl)) {
    return NextResponse.json(
      { error: "Supported: target.com, bestbuy.com, walmart.com, ebay.com, tcgplayer.com, pokemoncenter.com, samsclub.com, amazon.com" },
      { status: 400 },
    );
  }

  const scraped = await scrapeProduct(trimmedUrl);
  if (!scraped) {
    return NextResponse.json(
      { error: "Could not fetch product data from the URL" },
      { status: 400 },
    );
  }

  const product = await addProduct({
    url: trimmedUrl,
    name: scraped.name,
    price: scraped.price,
    inStock: scraped.inStock,
    imageUrl: scraped.imageUrl,
    source: scraped.source,
    lastChecked: scraped.lastChecked,
  });

  return NextResponse.json(product, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (action === "clear-alert" && id) {
    await clearAlert(id);
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 },
    );
  }

  const removed = await removeProduct(id);
  if (!removed) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
