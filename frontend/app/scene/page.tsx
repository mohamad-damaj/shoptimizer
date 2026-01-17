"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Box } from "@react-three/drei";
import { GetStorefrontData } from "@/utils/ShopifyGet";
import { STOREFRONT_PRODUCTS_QUERY } from "@/utils/queries";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ProductNode = { id: string; title?: string };
type ProductEdge = { node?: ProductNode };

function ProductBox({ position, title }: { position: [number, number, number]; title: string }) {
  return (
    <group position={position}>
      <Box args={[1, 1, 1]} castShadow>
        <meshStandardMaterial color="#2e7d32" />
      </Box>
      <Text position={[0, 1.5, 0]} fontSize={0.3} color="#ffffff" anchorX="center">
        {title}
      </Text>
    </group>
  );
}

function Scene3D({ products }: { products: ProductEdge[] }) {
  return (
    <>
      <Canvas
        camera={{ position: [0, 5, 8], fov: 75 }}
        style={{ width: "100%", height: "100vh" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f1f8f5" />
        </mesh>

        {/* Product boxes */}
        {products.map((product, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const x = (col - 1) * 3;
          const z = row * 3;
          const title = product?.node?.title || `Product ${index + 1}`;
          
          return (
            <ProductBox
              key={product?.node?.id || index}
              position={[x, 0, z]}
              title={title.substring(0, 20)}
            />
          );
        })}

        <OrbitControls />
      </Canvas>
    </>
  );
}

export default function Scene() {
  const searchParams = useSearchParams();
  const storefrontUrl = searchParams.get("storefront_url") as string;
  const accessToken = searchParams.get("access_token") as string;

  const [products, setProducts] = useState<ProductEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await GetStorefrontData(
          storefrontUrl,
          accessToken,
          STOREFRONT_PRODUCTS_QUERY,
          {},
        );
        setProducts(data?.data?.products?.edges || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch products",
        );
      } finally {
        setLoading(false);
      }
    };

    if (storefrontUrl && accessToken) {
      fetchProducts();
    }
  }, [storefrontUrl, accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <p className="text-green-900 text-xl">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <p className="text-red-600 text-xl">Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh", margin: 0, padding: 0 }}>
      <Scene3D products={products} />
    </div>
  );

