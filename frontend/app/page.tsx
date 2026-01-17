"use server";

import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function Home() {
  return (
    <div className="p-6">
      <form
        action={handleStorefrontSubmit}
        className="flex flex-col gap-4 justify-center max-w-5xl"
      >
        <Input
          type="text"
          name="storefront_url"
          placeholder="myshop.myshopify.com"
          required
        />
        <Input
          type="text"
          name="access_token"
          placeholder="010101010101"
          required
        />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}

export async function handleStorefrontSubmit(formData: FormData) {
  const storefrontUrl = formData.get("storefront_url") as string;
  const accessToken = formData.get("access_token") as string;

  // redirect to a new page with the provided storefront URL and access token
  redirect(
    `/scene?storefront_url=${encodeURIComponent(storefrontUrl)}&access_token=${encodeURIComponent(accessToken)}`,
  );
}
