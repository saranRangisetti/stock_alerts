import { NextResponse } from "next/server";
import { getProducts, updateProduct, getEmailSettings, type TrackedProduct } from "@/lib/storage";
import { scrapeProduct } from "@/lib/scraper";
import { sendRestockEmail } from "@/lib/email";

const PER_PRODUCT_TIMEOUT = 10000; // 10 seconds max per product

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function GET() {
  const products = getProducts();

  if (products.length === 0) {
    return NextResponse.json({ products: [], alerts: [] });
  }

  const results = await Promise.allSettled(
    products.map(async (product) => {
      const scraped = await withTimeout(scrapeProduct(product.url), PER_PRODUCT_TIMEOUT);
      if (!scraped) return product;

      // Track restock: was out of stock, now in stock
      const isRestock = !product.inStock && scraped.inStock;

      const updated = updateProduct(product.id, {
        name: scraped.name || product.name,
        price: scraped.price ?? product.price,
        inStock: scraped.inStock,
        imageUrl: scraped.imageUrl || product.imageUrl,
        lastChecked: scraped.lastChecked,
        // Only update previouslyInStock if it's NOT a restock alert
        // (keep it false so the alert shows until user dismisses)
        ...(isRestock ? {} : { previouslyInStock: scraped.inStock }),
      });

      return updated || product;
    }),
  );

  const updatedProducts = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((p): p is TrackedProduct => p !== null);

  // Find restock alerts
  const alerts = updatedProducts.filter(
    (p) => p.inStock && !p.previouslyInStock,
  );

  // Send email notification for restocks
  if (alerts.length > 0) {
    const emailSettings = getEmailSettings();
    if (emailSettings.enabled && emailSettings.senderEmail && emailSettings.senderAppPassword && emailSettings.recipientEmail) {
      // Send email in background (don't block the response)
      sendRestockEmail(emailSettings, alerts).catch((err) =>
        console.error("Failed to send restock email:", err),
      );
    }
  }

  return NextResponse.json({ products: updatedProducts, alerts });
}
