import * as cheerio from "cheerio";

export interface ScrapedProduct {
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  productUrl: string;
  source: string;
  lastChecked: string;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const FETCH_TIMEOUT = 8000; // 8 second timeout for all fetches

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
}

function detectSource(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "www.pokemoncenter.com" || hostname === "pokemoncenter.com") return "pokemoncenter";
    if (hostname === "www.target.com" || hostname === "target.com") return "target";
    if (hostname === "www.walmart.com" || hostname === "walmart.com") return "walmart";
    if (hostname === "www.bestbuy.com" || hostname === "bestbuy.com") return "bestbuy";
    if (hostname === "www.samsclub.com" || hostname === "samsclub.com") return "samsclub";
    if (hostname === "www.ebay.com" || hostname === "ebay.com") return "ebay";
    if (hostname === "www.tcgplayer.com" || hostname === "tcgplayer.com") return "tcgplayer";
    if (hostname === "www.amazon.com" || hostname === "amazon.com") return "amazon";
    return null;
  } catch {
    return null;
  }
}

// Generic scraper that works for most sites via JSON-LD + HTML fallback
async function scrapeGeneric(url: string, source: string): Promise<ScrapedProduct> {
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  const html = await res.text();
  const $ = cheerio.load(html);

  let name = "";
  let price: number | null = null;
  let inStock = false;
  let imageUrl: string | null = null;

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const product = data["@type"] === "Product" ? data : null;
      if (product) {
        name = product.name || "";
        imageUrl = product.image?.[0] || product.image || null;
        const offer = product.offers
          ? Array.isArray(product.offers) ? product.offers[0] : product.offers
          : null;
        if (offer) {
          price = parseFloat(offer.price) || null;
          inStock = offer.availability?.includes("InStock") || false;
        }
      }
    } catch { /* ignore */ }
  });

  if (!name) {
    name = $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content") || "Unknown Product";
  }
  if (!imageUrl) {
    imageUrl = $('meta[property="og:image"]').attr("content") || null;
  }
  if (price === null) {
    const priceText = $('[class*="price"]').first().text() || $('meta[property="product:price:amount"]').attr("content") || "";
    const m = priceText.match(/\$?([\d,]+\.?\d*)/);
    if (m) price = parseFloat(m[1].replace(",", ""));
  }

  return { name, price, inStock, imageUrl, productUrl: url, source, lastChecked: new Date().toISOString() };
}

async function scrapeTarget(url: string): Promise<ScrapedProduct> {
  const tcinMatch = url.match(/A-(\d+)/);
  if (tcinMatch) {
    try {
      const tcin = tcinMatch[1];
      const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&tcin=${tcin}&pricing_store_id=3991&has_pricing_store_id=true`;
      const apiRes = await fetchWithTimeout(apiUrl, { headers: { ...HEADERS, Accept: "application/json" } });
      if (apiRes.ok) {
        const data = await apiRes.json();
        const product = data?.data?.product;
        if (product) {
          const priceData = product.price?.formatted_current_price || "";
          const m = priceData.match(/\$?([\d,]+\.?\d*)/);
          return {
            name: product.item?.product_description?.title || "Unknown",
            price: m ? parseFloat(m[1].replace(",", "")) : null,
            inStock: product.fulfillment?.shipping_options?.availability_status === "IN_STOCK" ||
              product.fulfillment?.store_options?.[0]?.in_store_only?.availability_status === "IN_STOCK",
            imageUrl: product.item?.enrichment?.images?.primary_image_url || null,
            productUrl: url,
            source: "target",
            lastChecked: new Date().toISOString(),
          };
        }
      }
    } catch { /* fallback below */ }
  }
  return scrapeGeneric(url, "target");
}

async function scrapeBestBuy(url: string): Promise<ScrapedProduct> {
  try {
    const res = await fetchWithTimeout(url, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    let name = "";
    let price: number | null = null;
    let inStock = false;
    let imageUrl: string | null = null;

    // JSON-LD first
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@type"] === "Product") {
          name = data.name || "";
          imageUrl = data.image || null;
          const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
          if (offer) {
            price = parseFloat(offer.price) || null;
            inStock = offer.availability?.includes("InStock") || false;
          }
        }
      } catch { /* ignore */ }
    });

    if (!name) {
      name = $(".sku-title h1, h1[class*='heading']").first().text().trim() || $("h1").first().text().trim() || "Unknown Product";
    }
    if (price === null) {
      const priceText = $(".priceView-customer-price span, [class*='price'] span[aria-hidden='true']").first().text();
      const m = priceText.match(/\$?([\d,]+\.?\d*)/);
      if (m) price = parseFloat(m[1].replace(",", ""));
    }
    if (!imageUrl) {
      imageUrl = $("img.primary-image, img[class*='primary']").first().attr("src") || $('meta[property="og:image"]').attr("content") || null;
    }
    if (!inStock) {
      const btnText = $("button.add-to-cart-button, [class*='add-to-cart']").first().text().trim().toLowerCase();
      inStock = btnText.includes("add to cart") && !btnText.includes("sold out");
    }

    return { name, price, inStock, imageUrl, productUrl: url, source: "bestbuy", lastChecked: new Date().toISOString() };
  } catch {
    return scrapeGeneric(url, "bestbuy");
  }
}

async function scrapeEbay(url: string): Promise<ScrapedProduct> {
  try {
    const res = await fetchWithTimeout(url, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $("h1.x-item-title__mainTitle span, h1[class*='item-title']").first().text().trim()
      || $("h1").first().text().trim() || "Unknown Product";
    const priceText = $(".x-price-primary span, [class*='price'] span").first().text();
    const m = priceText.match(/\$?([\d,]+\.?\d*)/);
    const price = m ? parseFloat(m[1].replace(",", "")) : null;
    const imageUrl = $("img#icImg, img[class*='image--main']").first().attr("src") || $('meta[property="og:image"]').attr("content") || null;
    const soldOut = $("[class*='ended'], [class*='sold']").length > 0;

    return { name, price, inStock: !soldOut, imageUrl, productUrl: url, source: "ebay", lastChecked: new Date().toISOString() };
  } catch {
    return scrapeGeneric(url, "ebay");
  }
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  const source = detectSource(url);
  if (!source) return null;

  try {
    if (source === "target") return await scrapeTarget(url);
    if (source === "bestbuy") return await scrapeBestBuy(url);
    if (source === "ebay") return await scrapeEbay(url);
    return await scrapeGeneric(url, source);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }
  return null;
}

export function isSupportedUrl(url: string): boolean {
  return detectSource(url) !== null;
}
