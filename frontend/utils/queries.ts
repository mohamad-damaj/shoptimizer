export const STOREFRONT_PRODUCTS_QUERY = `query GetProducts {
  products(first: 1) {
    edges {
      node {
        id
        title
        handle
        description
        
        # 1. Get the main featured image
        featuredImage {
          id
          url
          altText
        }
        
        # 2. Get all media (images, videos, etc.)
        media(first: 5) {
          edges {
            node {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
}`;
