"use client";

import { useEffect, useState } from "react";
import { STOREFRONT_PRODUCTS_QUERY } from "@/utils/queries";

export default function Test() {
  console.log("what is happening????");
  useEffect(() => {
    console.log("insdie of useeffect");
    const storefrontUrl = "w7vgar-u1.myshopify.com";
    const accessToken = "0a80911fde80bbbb611d613777e992ab";
    console.log("Storefront URL:", storefrontUrl);
    console.log("Access Token:", accessToken);
    try {
      setLoading(true);

      console.log("Fetching storefront data...");
      // Fetch data from backend or directly from Shopify Storefront API
      const response = fetch(
        `https://${storefrontUrl}/api/2026-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": accessToken,
          },
          body: JSON.stringify({ STOREFRONT_PRODUCTS_QUERY, variables: {} }),
        },
      )
        .then((res) => res.json())
        .catch((error) => {
          console.error("Error fetching Shopify data:", error);
          throw error;
        });

      if (!response?.data?.products?.edges) {
        throw new Error(
          `Invalid response structure: ${JSON.stringify(response)}`,
        );
      }
      console.log("Storefront response:", response);
      // setStorefrontData(response);

      // // Loop over items and fetch 3D counterparts using API
      // const mutated_response = [];
      // let counter = 1;
      // for (const item of response.data.products.edges) {
      //   const product = item.node;
      //   const backendResponse = await GenerateProduct3D(product);
      //   const generatedResponse = await PollTaskId(backendResponse.task_id);
      //   mutated_response.push(
      //     mapToOutputFormat(counter, generatedResponse, backendResponse),
      //   );
      //   counter++;
      // }
      // setStorefrontData(mutated_response);
    } catch (error) {
      console.error("Error fetching storefront data:", error);
    } finally {
      setLoading(false);
    }

    console.log("heyeheeheh");
  }, []);

  //   const [storefrontData, setStorefrontData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loading) {
    return <div>Loading storefront data...</div>;
  }

  return <div>test Page</div>;
}
