import { ShopifyProductData } from "@/utils/types";

export async function GenerateProduct3D(product: ShopifyProductData) {
  console.log("query data:", product);
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-product-3d`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_data: product }),
    },
  )
    .then((res) => res.json())
    .catch((error) => {
      console.error("Error generating 3D model:", error);
      throw error;
    });

  return response; // This will return a task id that we have to poll
}

async function FetchTaskStatus(taskId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/task-result/${taskId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
    .then((res) => res.json())
    .catch((error) => {
      console.error("Error polling task status:", error);
      throw error;
    });
  return response; // This will return the status and possibly the 3D model URL
}

export async function PollTaskId(
  taskId: string,
  maxWaitTime: number = 300000, // 5 minutes default
  pollInterval: number = 1000, // Poll every 2 seconds
) {
  const startTime = Date.now();
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    try {
      const response = await FetchTaskStatus(taskId);

      console.log(`[${elapsedTime / 1000}s] Task status: ${response.status}`);

      // Check if task is complete
      if (response.status === "success") {
        console.log("Task completed successfully!");
        return response;
      }

      // Update elapsed time
      elapsedTime = Date.now() - startTime;

      // If still pending, wait before polling again
      if (response.status === "pending") {
        console.log(
          `Task still ${response.status}. Waiting ${pollInterval / 1000}s before next poll...`,
        );
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      // Update elapsed time again
      elapsedTime = Date.now() - startTime;
    } catch (error) {
      console.error("Error during polling:", error);
      throw error;
    }
  }

  // Timeout reached
  throw new Error(
    `Task polling timed out after ${maxWaitTime / 1000} seconds. Task ID: ${taskId}`,
  );
}
