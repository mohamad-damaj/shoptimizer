"use server";

import { GetStorefrontData } from "@/utils/ShopifyGet";
import { STOREFRONT_PRODUCTS_QUERY } from "@/utils/queries";

export default async function Home() {
  const data = await GetStorefrontData(STOREFRONT_PRODUCTS_QUERY);
  let productString = "";

  try {
    // Try to build a readable string from the returned data
    const edges = data?.data?.products?.edges || [];
    const titles = edges.map((e: any) => e?.node?.title).filter(Boolean);

    productString = titles.length ? titles.join(", ") : "No products found";
  } catch (err) {
    console.error("Error loading storefront data:", err);
    productString = "Failed to load storefront data";
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Storefront products</h1>
      <p className="mb-4">{productString}</p>

      <details>
        <summary className="cursor-pointer">Raw response (debug)</summary>
        <pre className="mt-2 max-h-96 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
