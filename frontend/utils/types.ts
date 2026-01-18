export interface ShopifyProductData {
  title: string;
  description?: string;
  product_type?: string;
  tags?: string[];
  featured_image: FeaturedImage;
  id?: string;
}

export interface FeaturedImage {
  url: string;
  alt_text?: string;
}

export interface OutputFormat {
  id: number;
  title: string;
  description: string;
  aiCode: string;
}
