export function GetStorefrontData(
  storefrontURL: string,
  accessToken: string,
  query: string,
  variables: Record<string, any> = {},
) {
  // Fallback: call Shopify Storefront API directly using server-side env vars
  const response = fetch(`https://${storefrontURL}/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })
    .then((res) => res.json())
    .catch((error) => {
      console.error("Error fetching Shopify data:", error);
      throw error;
    });

  return response;
}
