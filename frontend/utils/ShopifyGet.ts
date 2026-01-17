export async function GetStorefrontData(query: string, variables = {}) {
  // Fallback: call Shopify Storefront API directly using server-side env vars
  const response = await fetch(
    `https://${process.env.NEXT_SHOPIFY_STORE_DOMAIN}/api/2026-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env
          .SHOPIFY_GRAPHQL_ACCESS_TOKEN as string,
      },
      body: JSON.stringify({ query, variables }),
    }
  )
    .then((res) => res.json())
    .catch((error) => {
      console.error("Error fetching Shopify data:", error);
      throw error;
    });

  return response;
}
