import * as cheerio from "cheerio";

export type RetailerSource =
  | "pokemontcg"
  | "optcg"
  | "target"
  | "walmart"
  | "bestbuy"
  | "samsclub"
  | "pokemoncenter"
  | "tcgplayer"
  | "ebay";

export interface CatalogProduct {
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  productUrl: string;
  source: RetailerSource;
  rating?: number | null;
  reviewCount?: number | null;
  sku?: string | null;
  category?: string | null;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  date: string;
  source: string;
  imageUrl: string | null;
  type: "launch" | "restock" | "news" | "deal";
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const FETCH_TIMEOUT = 8000; // 8 second timeout for all fetches

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
}

// ─── Retailer & Category Definitions ────────────────────────────────

export interface CategoryDef {
  id: string;
  label: string;
  source: RetailerSource;
}

export interface RetailerDef {
  id: RetailerSource;
  name: string;
  color: string;
  status: "api" | "links";
  description: string;
}

export const RETAILERS: RetailerDef[] = [
  { id: "pokemontcg", name: "Pokemon TCG", color: "yellow", status: "api", description: "Full Pokemon card database with market prices from TCGPlayer" },
  { id: "optcg", name: "One Piece TCG", color: "red", status: "api", description: "One Piece card database with set info and card images" },
  { id: "target", name: "Target", color: "red", status: "api", description: "Live product search with real-time stock & pricing" },
  { id: "bestbuy", name: "Best Buy", color: "yellow", status: "api", description: "Live product search with availability & store inventory" },
  { id: "ebay", name: "eBay", color: "blue", status: "api", description: "Live marketplace listings with current prices" },
  { id: "tcgplayer", name: "TCGPlayer", color: "orange", status: "api", description: "TCG marketplace prices and listings" },
  { id: "walmart", name: "Walmart", color: "blue", status: "links", description: "Quick links to search results" },
  { id: "samsclub", name: "Sam's Club", color: "sky", status: "links", description: "Quick links to search results" },
  { id: "pokemoncenter", name: "Pokemon Center", color: "amber", status: "links", description: "Quick links to categories" },
];

export const CATEGORIES: CategoryDef[] = [
  // Pokemon TCG API
  { id: "ptcg-latest", label: "Latest Set", source: "pokemontcg" },
  { id: "ptcg-recent", label: "Recent Sets", source: "pokemontcg" },
  { id: "ptcg-sets", label: "All Sets", source: "pokemontcg" },
  { id: "ptcg-rare", label: "Rare & Valuable Cards", source: "pokemontcg" },
  // One Piece TCG API
  { id: "optcg-latest", label: "Latest Cards", source: "optcg" },
  { id: "optcg-leaders", label: "Leader Cards", source: "optcg" },
  { id: "optcg-all", label: "All Sets", source: "optcg" },
  // Target
  { id: "tgt-pokemon-cards", label: "Pokemon Cards", source: "target" },
  { id: "tgt-onepiece-cards", label: "One Piece Cards", source: "target" },
  { id: "tgt-pokemon-etb", label: "Pokemon ETBs", source: "target" },
  { id: "tgt-pokemon-toys", label: "Pokemon Toys", source: "target" },
  { id: "tgt-onepiece-figures", label: "One Piece Figures", source: "target" },
  { id: "tgt-tcg-accessories", label: "TCG Accessories", source: "target" },
  // Best Buy
  { id: "bb-pokemon-cards", label: "Pokemon Cards", source: "bestbuy" },
  { id: "bb-onepiece", label: "One Piece", source: "bestbuy" },
  { id: "bb-pokemon-games", label: "Pokemon Video Games", source: "bestbuy" },
  { id: "bb-collectibles", label: "Collectibles & Figures", source: "bestbuy" },
  { id: "bb-trading-cards", label: "All Trading Cards", source: "bestbuy" },
  // eBay
  { id: "ebay-pokemon-cards", label: "Pokemon Cards", source: "ebay" },
  { id: "ebay-pokemon-sealed", label: "Pokemon Sealed Products", source: "ebay" },
  { id: "ebay-onepiece-cards", label: "One Piece Cards", source: "ebay" },
  { id: "ebay-pokemon-etb", label: "Pokemon ETBs", source: "ebay" },
  // TCGPlayer
  { id: "tcg-pokemon", label: "Pokemon Cards", source: "tcgplayer" },
  { id: "tcg-onepiece", label: "One Piece Cards", source: "tcgplayer" },
  { id: "tcg-sealed", label: "Sealed Products", source: "tcgplayer" },
  // Walmart (links)
  { id: "wmt-pokemon", label: "Pokemon Cards", source: "walmart" },
  { id: "wmt-onepiece", label: "One Piece Cards", source: "walmart" },
  { id: "wmt-pokemon-toys", label: "Pokemon Toys", source: "walmart" },
  // Sam's Club (links)
  { id: "sc-pokemon", label: "Pokemon", source: "samsclub" },
  { id: "sc-onepiece", label: "One Piece", source: "samsclub" },
  // Pokemon Center (links)
  { id: "pc-tcg", label: "Trading Cards", source: "pokemoncenter" },
  { id: "pc-plush", label: "Plush", source: "pokemoncenter" },
  { id: "pc-figures", label: "Figures", source: "pokemoncenter" },
];

// ─── Direct Search Links (for blocked retailers) ───────────────────

const SEARCH_LINKS: Record<string, { url: string; label: string }> = {
  "wmt-pokemon": { url: "https://www.walmart.com/search?q=pokemon+trading+cards", label: "Pokemon Cards on Walmart" },
  "wmt-onepiece": { url: "https://www.walmart.com/search?q=one+piece+trading+cards", label: "One Piece Cards on Walmart" },
  "wmt-pokemon-toys": { url: "https://www.walmart.com/search?q=pokemon+toys", label: "Pokemon Toys on Walmart" },
  "sc-pokemon": { url: "https://www.samsclub.com/s/pokemon", label: "Pokemon on Sam's Club" },
  "sc-onepiece": { url: "https://www.samsclub.com/s/one+piece", label: "One Piece on Sam's Club" },
  "pc-tcg": { url: "https://www.pokemoncenter.com/category/trading-card-game", label: "Trading Cards on Pokemon Center" },
  "pc-plush": { url: "https://www.pokemoncenter.com/category/plush", label: "Plush on Pokemon Center" },
  "pc-figures": { url: "https://www.pokemoncenter.com/category/figures", label: "Figures on Pokemon Center" },
};

export function getSearchLink(categoryId: string): { url: string; label: string } | null {
  return SEARCH_LINKS[categoryId] || null;
}

// ─── Pokemon TCG API (Free, no key needed) ──────────────────────────

async function scrapePokemonTCG(categoryId: string): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];

  try {
    if (categoryId === "ptcg-sets") {
      const res = await fetchWithTimeout("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=20");
      const data = await res.json();
      for (const set of data.data || []) {
        products.push({
          name: `${set.name} (${set.series})`,
          price: null,
          inStock: true,
          imageUrl: set.images?.logo || null,
          productUrl: `https://www.pokemontcg.io/sets/${set.id}`,
          source: "pokemontcg",
          category: "Set",
        });
      }
      return products;
    }

    if (categoryId === "ptcg-rare") {
      const cardsRes = await fetchWithTimeout(
        `https://api.pokemontcg.io/v2/cards?q=rarity:"Illustration Rare" OR rarity:"Special Art Rare" OR rarity:"Hyper Rare" OR rarity:"Secret Rare"&orderBy=-set.releaseDate&pageSize=48&select=id,name,set,images,tcgplayer,rarity`,
      );
      const cardsData = await cardsRes.json();
      for (const card of cardsData.data || []) {
        let price: number | null = null;
        if (card.tcgplayer?.prices) {
          const priceTypes = Object.values(card.tcgplayer.prices) as Array<Record<string, number>>;
          if (priceTypes.length > 0 && priceTypes[0].market) {
            price = priceTypes[0].market;
          }
        }
        products.push({
          name: `${card.name} (${card.rarity || "Rare"}) - ${card.set?.name || ""}`,
          price,
          inStock: true,
          imageUrl: card.images?.small || null,
          productUrl: card.tcgplayer?.url || `https://www.pokemontcg.io/card/${card.id}`,
          source: "pokemontcg",
          category: card.rarity || "Rare",
        });
      }
      return products;
    }

    const setCount = categoryId === "ptcg-latest" ? 1 : 3;
    const setsRes = await fetchWithTimeout(
      `https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=${setCount}`,
    );
    const setsData = await setsRes.json();
    const sets = setsData.data || [];

    for (const set of sets) {
      const cardsRes = await fetchWithTimeout(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${set.id}&pageSize=50&select=id,name,set,images,tcgplayer,cardmarket,supertype,subtypes,rarity`,
      );
      const cardsData = await cardsRes.json();

      for (const card of cardsData.data || []) {
        let price: number | null = null;
        if (card.tcgplayer?.prices) {
          const priceTypes = Object.values(card.tcgplayer.prices) as Array<Record<string, number>>;
          if (priceTypes.length > 0 && priceTypes[0].market) {
            price = priceTypes[0].market;
          }
        }

        products.push({
          name: `${card.name}${card.rarity ? ` (${card.rarity})` : ""} - ${set.name}`,
          price,
          inStock: true,
          imageUrl: card.images?.small || null,
          productUrl: card.tcgplayer?.url || `https://www.pokemontcg.io/card/${card.id}`,
          source: "pokemontcg",
          category: card.rarity || card.supertype || null,
        });
      }
    }
  } catch (error) {
    console.error("Pokemon TCG API error:", error);
  }

  return products;
}

// ─── One Piece TCG API (Free, no key needed) ────────────────────────

async function scrapeOnePieceTCG(categoryId: string): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];

  try {
    if (categoryId === "optcg-all") {
      const res = await fetchWithTimeout("https://optcgapi.com/api/series");
      if (!res.ok) throw new Error("OPTCG API error");
      const series = await res.json();

      for (const s of (Array.isArray(series) ? series : series.results || []).slice(0, 20)) {
        products.push({
          name: s.name || s.title || `Set ${s.id}`,
          price: null,
          inStock: true,
          imageUrl: s.image || null,
          productUrl: `https://en.onepiece-cardgame.com/`,
          source: "optcg",
          category: "Set",
        });
      }
      return products;
    }

    let url = "https://optcgapi.com/api/cards?limit=48";
    if (categoryId === "optcg-leaders") {
      url += "&type=Leader";
    } else if (categoryId === "optcg-latest") {
      url += "&ordering=-id";
    }

    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error("OPTCG API error");
    const data = await res.json();
    const cards = Array.isArray(data) ? data : data.results || [];

    for (const card of cards) {
      const cardName = card.name || card.card_name || "Unknown Card";
      const cardId = card.card_id || card.code || card.id || "";
      const cardSet = card.set_name || card.series_name || card.set || "";
      const imageUrl = card.image || card.card_image || card.img || null;
      const cardType = card.type || card.card_type || card.category || null;
      const color = card.color || card.card_color || "";

      products.push({
        name: `${cardName}${cardSet ? ` - ${cardSet}` : ""}${cardId ? ` [${cardId}]` : ""}`,
        price: card.price || null,
        inStock: true,
        imageUrl,
        productUrl: card.url || `https://en.onepiece-cardgame.com/`,
        source: "optcg",
        category: [cardType, color].filter(Boolean).join(" / ") || null,
      });
    }
  } catch (error) {
    console.error("One Piece TCG API error:", error);
  }

  return products;
}

// ─── Target: Redsky API ─────────────────────────────────────────────

const TARGET_API_KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96";

const TARGET_SEARCH: Record<string, string> = {
  "tgt-pokemon-cards": "pokemon trading cards",
  "tgt-onepiece-cards": "one piece trading cards",
  "tgt-pokemon-etb": "pokemon elite trainer box",
  "tgt-pokemon-toys": "pokemon toys figures",
  "tgt-onepiece-figures": "one piece figures",
  "tgt-tcg-accessories": "trading card sleeves binder",
};

async function scrapeTarget(categoryId: string): Promise<CatalogProduct[]> {
  const searchTerm = TARGET_SEARCH[categoryId];
  if (!searchTerm) return [];

  try {
    const params = new URLSearchParams({
      key: TARGET_API_KEY,
      channel: "WEB",
      count: "24",
      default_purchasability_filter: "true",
      include_sponsored: "false",
      keyword: searchTerm,
      offset: "0",
      page: `/s/${encodeURIComponent(searchTerm)}`,
      platform: "desktop",
      pricing_store_id: "3991",
      store_ids: "3991",
      visitor_id: "visitor_" + Date.now(),
    });

    const res = await fetchWithTimeout(
      `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?${params}`,
      { headers: { ...HEADERS, Accept: "application/json" } },
    );

    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.data?.search?.products || data?.data?.search?.items || [];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return items
      .map((item: any) => {
        const product = item?.item || item;
        const pricing = item?.price || item?.pricing;
        const enrichment = product?.enrichment || {};
        const fulfillment = item?.fulfillment || {};
        const ratings = item?.ratings_and_reviews || product?.ratings_and_reviews;

        const name =
          product?.product_description?.title ||
          product?.description?.title ||
          product?.title ||
          "";
        if (!name) return null;

        const tcin = item?.tcin || product?.tcin || "";
        const priceStr = String(
          pricing?.formatted_current_price || pricing?.current_retail || "",
        );
        const priceMatch = priceStr.match(/\$?([\d,]+\.?\d*)/);
        const price = priceMatch
          ? parseFloat(priceMatch[1].replace(",", ""))
          : null;

        const imageUrl = enrichment?.images?.primary_image_url || product?.images?.primary_image_url || null;
        const inStock =
          fulfillment?.shipping_options?.availability_status === "IN_STOCK" ||
          fulfillment?.store_options?.[0]?.in_store_only?.availability_status === "IN_STOCK";

        return {
          name: decode(name),
          price,
          inStock: !!inStock,
          imageUrl,
          productUrl: tcin
            ? `https://www.target.com/p/-/A-${tcin}`
            : `https://www.target.com/s?searchTerm=${encodeURIComponent(searchTerm)}`,
          source: "target" as const,
          rating: ratings?.statistics?.rating?.average || null,
          reviewCount: ratings?.statistics?.rating?.count || null,
          sku: tcin || null,
        };
      })
      .filter(Boolean) as CatalogProduct[];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (error) {
    console.error("Target scrape error:", error);
    return [];
  }
}

// ─── Best Buy: HTML Scraping ────────────────────────────────────────

const BB_SEARCH: Record<string, string> = {
  "bb-pokemon-cards": "pokemon trading cards",
  "bb-onepiece": "one piece cards figures",
  "bb-pokemon-games": "pokemon video game nintendo",
  "bb-collectibles": "pokemon collectible figure",
  "bb-trading-cards": "trading card game booster",
};

async function scrapeBestBuy(categoryId: string): Promise<CatalogProduct[]> {
  const searchTerm = BB_SEARCH[categoryId];
  if (!searchTerm) return [];

  try {
    const searchUrl = `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(searchTerm)}`;
    const res = await fetchWithTimeout(searchUrl, { headers: HEADERS });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const products: CatalogProduct[] = [];

    // Try parsing search results
    $(".sku-item, [class*='sku-item'], .list-item").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".sku-title a, .sku-header a, h4.sku-title a").first().text().trim();
      const href = $el.find(".sku-title a, .sku-header a, h4.sku-title a").first().attr("href") || "";
      const priceText = $el.find(".priceView-customer-price span, [class*='price'] span").first().text().trim();
      const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : null;
      const imageUrl = $el.find("img.product-image, img[class*='product']").first().attr("src") || null;
      const sku = $el.attr("data-sku-id") || null;

      const addToCartBtn = $el.find("button.add-to-cart-button, [class*='add-to-cart']").first();
      const buttonText = addToCartBtn.text().trim().toLowerCase();
      const isDisabled = addToCartBtn.attr("disabled") !== undefined;
      const inStock = !isDisabled && buttonText !== "sold out" && buttonText !== "coming soon";

      if (name && href) {
        products.push({
          name: decode(name),
          price,
          inStock,
          imageUrl,
          productUrl: href.startsWith("http") ? href : `https://www.bestbuy.com${href}`,
          source: "bestbuy",
          sku,
        });
      }
    });

    // Fallback: JSON-LD
    if (products.length === 0) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonData = JSON.parse($(el).text());
          const items = jsonData?.itemListElement || jsonData?.mainEntity?.itemListElement || [];
          for (const item of items) {
            const prod = item?.item || item;
            if (prod?.name) {
              products.push({
                name: decode(prod.name),
                price: prod.offers?.price ? parseFloat(prod.offers.price) : null,
                inStock: prod.offers?.availability?.includes("InStock") ?? false,
                imageUrl: prod.image || null,
                productUrl: prod.url || prod["@id"] || searchUrl,
                source: "bestbuy",
              });
            }
          }
        } catch { /* ignore */ }
      });
    }

    return products.slice(0, 24);
  } catch (error) {
    console.error("Best Buy scrape error:", error);
    return [];
  }
}

// ─── eBay Search (Public search) ─────────────────────────────────────

const EBAY_SEARCH: Record<string, { query: string; category?: string }> = {
  "ebay-pokemon-cards": { query: "pokemon trading cards booster", category: "183454" },
  "ebay-pokemon-sealed": { query: "pokemon sealed booster box etb", category: "183454" },
  "ebay-onepiece-cards": { query: "one piece trading card game", category: "183454" },
  "ebay-pokemon-etb": { query: "pokemon elite trainer box sealed", category: "183454" },
};

async function scrapeEbay(categoryId: string): Promise<CatalogProduct[]> {
  const searchConfig = EBAY_SEARCH[categoryId];
  if (!searchConfig) return [];

  try {
    const params = new URLSearchParams({
      _nkw: searchConfig.query,
      _sop: "12",
      LH_BIN: "1",
      _ipg: "48",
    });
    if (searchConfig.category) {
      params.set("_sacat", searchConfig.category);
    }

    const res = await fetchWithTimeout(`https://www.ebay.com/sch/i.html?${params}`, {
      headers: HEADERS,
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const products: CatalogProduct[] = [];

    $(".s-item, [class*='s-item']").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".s-item__title, [class*='item__title'] span").first().text().trim();
      const href = $el.find(".s-item__link, a[class*='item__link']").first().attr("href") || "";
      const priceText = $el.find(".s-item__price, [class*='item__price']").first().text().trim();
      const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : null;
      const imageUrl = $el.find(".s-item__image-wrapper img, img[class*='item__image']").first().attr("src") || null;

      if (name && href && name !== "Shop on eBay" && !name.includes("Shop on eBay")) {
        products.push({
          name: decode(name),
          price,
          inStock: true,
          imageUrl: imageUrl?.includes("s-l") ? imageUrl : null,
          productUrl: href.split("?")[0],
          source: "ebay",
        });
      }
    });

    return products.slice(0, 24);
  } catch (error) {
    console.error("eBay scrape error:", error);
    return [];
  }
}

// ─── TCGPlayer Search ───────────────────────────────────────────────

const TCGPLAYER_SEARCH: Record<string, string> = {
  "tcg-pokemon": "pokemon",
  "tcg-onepiece": "one piece",
  "tcg-sealed": "pokemon sealed booster box",
};

async function scrapeTCGPlayer(categoryId: string): Promise<CatalogProduct[]> {
  const searchTerm = TCGPLAYER_SEARCH[categoryId];
  if (!searchTerm) return [];

  try {
    const res = await fetchWithTimeout(
      `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(searchTerm)}&view=grid`,
      { headers: HEADERS },
    );

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const products: CatalogProduct[] = [];

    $("[class*='search-result'], .product-card, [data-testid*='product']").each((_, el) => {
      const $el = $(el);
      const name = $el.find("[class*='product-card__title'], .product-card__title, h3, [class*='name']").first().text().trim();
      const href = $el.find("a").first().attr("href") || "";
      const priceText = $el.find("[class*='price'], .product-card__market-price, [class*='market']").first().text().trim();
      const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : null;
      const imageUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || null;

      if (name && href) {
        products.push({
          name: decode(name),
          price,
          inStock: true,
          imageUrl,
          productUrl: href.startsWith("http") ? href : `https://www.tcgplayer.com${href}`,
          source: "tcgplayer",
        });
      }
    });

    return products.slice(0, 24);
  } catch (error) {
    console.error("TCGPlayer scrape error:", error);
    return [];
  }
}

// ─── News & Launches Scraper ────────────────────────────────────────

export async function scrapeNews(): Promise<NewsItem[]> {
  const news: NewsItem[] = [];

  // PokeBeach
  try {
    const res = await fetchWithTimeout("https://www.pokebeach.com/", { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("article, .entry-content .post, .news-post, [class*='post']")
      .slice(0, 10)
      .each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2 a, h3 a, .entry-title a").first().text().trim();
        const href = $el.find("h2 a, h3 a, .entry-title a").first().attr("href") || "";
        const desc = $el.find("p, .entry-summary, .excerpt").first().text().trim().slice(0, 200);
        const imgUrl = $el.find("img").first().attr("src") || null;
        const dateText = $el.find("time, .date, .entry-date").first().text().trim()
          || $el.find("time").first().attr("datetime") || "";

        if (title && href) {
          const isDeal = /deal|sale|discount|%\s*off/i.test(title + desc);
          const isRestock = /restock|back in stock|available now/i.test(title + desc);
          const isLaunch = /new|release|launch|reveal|announce/i.test(title + desc);
          news.push({
            title,
            description: desc,
            url: href.startsWith("http") ? href : `https://www.pokebeach.com${href}`,
            date: dateText || new Date().toISOString().split("T")[0],
            source: "PokeBeach",
            imageUrl: imgUrl,
            type: isDeal ? "deal" : isRestock ? "restock" : isLaunch ? "launch" : "news",
          });
        }
      });
  } catch (error) {
    console.error("PokeBeach scrape error:", error);
  }

  // Pokemon.com
  try {
    const res = await fetchWithTimeout("https://www.pokemon.com/us/pokemon-news/", { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("li.news-list-item, .news-item, [class*='news'] article, .media-pokemon")
      .slice(0, 10)
      .each((_, el) => {
        const $el = $(el);
        const title = $el.find("h3, h2, .title").first().text().trim();
        const href = $el.find("a").first().attr("href") || "";
        const desc = $el.find("p, .description, .summary").first().text().trim().slice(0, 200);
        const imgUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || null;
        const dateText = $el.find("time, .date, .posted-date").first().text().trim() || "";

        if (title && href) {
          const isRestock = /restock|back in stock|available/i.test(title + desc);
          const isLaunch = /new|release|launch|reveal|announce|expansion/i.test(title + desc);
          news.push({
            title,
            description: desc,
            url: href.startsWith("http") ? href : `https://www.pokemon.com${href}`,
            date: dateText || new Date().toISOString().split("T")[0],
            source: "Pokemon.com",
            imageUrl: imgUrl,
            type: isRestock ? "restock" : isLaunch ? "launch" : "news",
          });
        }
      });
  } catch (error) {
    console.error("Pokemon.com scrape error:", error);
  }

  // PokeGuardian
  try {
    const res = await fetchWithTimeout("https://pokeguardian.com/", { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("article, .post, [class*='post-item']")
      .slice(0, 8)
      .each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2 a, h3 a, .entry-title a, .post-title a").first().text().trim();
        const href = $el.find("h2 a, h3 a, .entry-title a, .post-title a").first().attr("href") || "";
        const desc = $el.find("p, .excerpt, .entry-summary").first().text().trim().slice(0, 200);
        const imgUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-lazy-src") || null;
        const dateText = $el.find("time, .date, .entry-date").first().text().trim()
          || $el.find("time").first().attr("datetime") || "";

        if (title && href) {
          const isDeal = /deal|sale|discount/i.test(title + desc);
          const isRestock = /restock|back in stock|available now/i.test(title + desc);
          const isLaunch = /new|release|launch|reveal|announce|expansion|set/i.test(title + desc);
          news.push({
            title,
            description: desc,
            url: href.startsWith("http") ? href : `https://pokeguardian.com${href}`,
            date: dateText || new Date().toISOString().split("T")[0],
            source: "PokeGuardian",
            imageUrl: imgUrl,
            type: isDeal ? "deal" : isRestock ? "restock" : isLaunch ? "launch" : "news",
          });
        }
      });
  } catch (error) {
    console.error("PokeGuardian scrape error:", error);
  }

  // One Piece TCG News
  try {
    const res = await fetchWithTimeout("https://en.onepiece-cardgame.com/news/", { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("article, .news-item, .news-list-item, [class*='news']")
      .slice(0, 8)
      .each((_, el) => {
        const $el = $(el);
        const title = $el.find("h2, h3, .title, a[class*='title']").first().text().trim();
        const href = $el.find("a").first().attr("href") || "";
        const desc = $el.find("p, .description, .text").first().text().trim().slice(0, 200);
        const imgUrl = $el.find("img").first().attr("src") || null;
        const dateText = $el.find("time, .date, [class*='date']").first().text().trim() || "";

        if (title && href) {
          const isLaunch = /new|release|launch|reveal|booster|starter/i.test(title + desc);
          news.push({
            title,
            description: desc,
            url: href.startsWith("http") ? href : `https://en.onepiece-cardgame.com${href}`,
            date: dateText || new Date().toISOString().split("T")[0],
            source: "One Piece TCG",
            imageUrl: imgUrl,
            type: isLaunch ? "launch" : "news",
          });
        }
      });
  } catch (error) {
    console.error("One Piece TCG news error:", error);
  }

  return news;
}

// ─── Public API ─────────────────────────────────────────────────────

export async function discoverProducts(categoryId: string): Promise<CatalogProduct[]> {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];

  switch (category.source) {
    case "pokemontcg":
      return scrapePokemonTCG(categoryId);
    case "optcg":
      return scrapeOnePieceTCG(categoryId);
    case "target":
      return scrapeTarget(categoryId);
    case "bestbuy":
      return scrapeBestBuy(categoryId);
    case "ebay":
      return scrapeEbay(categoryId);
    case "tcgplayer":
      return scrapeTCGPlayer(categoryId);
    default:
      return [];
  }
}

export function getCategoriesForSource(source: RetailerSource): CategoryDef[] {
  return CATEGORIES.filter((c) => c.source === source);
}

// ─── Utils ──────────────────────────────────────────────────────────

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&trade;/g, "\u2122")
    .replace(/&reg;/g, "\u00AE")
    .replace(/&#8482;/g, "\u2122");
}
