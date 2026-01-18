"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface ProductData {
  id: number;
  title: string;
  description: string;
  aiCode: string;
}

// Dynamic AI Model Component
function DynamicModel({ aiCode }: { aiCode: string }) {
  const model = useMemo(() => {
    if (!aiCode || aiCode.length < 50) return null;

    try {
      const wrappedCode = `
        return (function(THREE) {
          ${aiCode}
        })(THREE);
      `;

      const createModel = new Function("THREE", wrappedCode);
      const newModel = createModel(THREE);

      if (!newModel || !(newModel instanceof THREE.Object3D)) {
        console.error("Invalid model returned from AI code");
        return null;
      }

      // Configure model
      newModel.traverse((node: any) => {
        if (node.isMesh) {
          if (node.geometry) {
            node.geometry.computeBoundingSphere();
            node.geometry.computeBoundingBox();
          }
          node.frustumCulled = false;
          node.castShadow = true;
          node.receiveShadow = true;

          if (!node.material) {
            node.material = new THREE.MeshStandardMaterial({
              color: 0xc0a080,
              roughness: 0.8,
              metalness: 0.1,
            });
          } else {
            node.material.side = THREE.DoubleSide;
            node.material.needsUpdate = true;
          }
        }
      });

      newModel.position.set(0, 2.5, 0);
      return newModel;
    } catch (err) {
      console.error("Failed to create model:", err);
      return null;
    }
  }, [aiCode]);

  if (!model) return null;

  return <primitive object={model} />;
}

// Background Decorations
function BackgroundDecor() {
  const sphere1Ref = React.useRef<THREE.Mesh>(null);
  const sphere2Ref = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (sphere1Ref.current) {
      sphere1Ref.current.position.y = 2 + Math.sin(time) * 0.5;
    }
    if (sphere2Ref.current) {
      sphere2Ref.current.position.y = 6 + Math.cos(time * 0.8) * 0.5;
    }
  });

  return (
    <group>
      <mesh position={[0, 5, -15]} rotation-x={Math.PI / 8}>
        <torusGeometry args={[8, 0.5, 16, 100]} />
        <meshPhysicalMaterial color={0xcba987} roughness={0.9} />
      </mesh>

      <mesh ref={sphere1Ref} position={[-12, 2, -10]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshPhysicalMaterial color={0xdba392} roughness={0.8} />
      </mesh>

      <mesh ref={sphere2Ref} position={[12, 6, -8]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshPhysicalMaterial color={0xc9b891} roughness={0.7} />
      </mesh>
    </group>
  );
}

// Glass Container
function GlassContainer() {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.6, 2.8, 0.2, 64]} />
        <meshStandardMaterial color={0x333333} roughness={0.2} />
      </mesh>

      {/* Glass */}
      <mesh position={[0, 2.7, 0]} renderOrder={2}>
        <cylinderGeometry args={[2.5, 2.5, 5.2, 64, 1, true]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transmission={0.98}
          thickness={0.5}
          ior={1.45}
          roughness={0.02}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// 3D Scene Component
function Scene({ product }: { product: ProductData }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[-0.2, 7.93, 20.7]} fov={35} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        target={[0, 2.5, 0]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={50}
      />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 15]}
        intensity={1.8}
        color="#fff0dd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <spotLight position={[-15, 10, 5]} intensity={0.8} color="#ddeeff" />
      <spotLight position={[0, 15, -20]} intensity={1.2} />

      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshPhysicalMaterial
          color={0xe0d0b8}
          metalness={0.1}
          roughness={0.2}
          clearcoat={0.1}
          reflectivity={0.2}
        />
      </mesh>

      <BackgroundDecor />

      <GlassContainer />
      {console.log(product.aiCode)}
      <Suspense fallback={null}>
        <DynamicModel key={product.id} aiCode={product.aiCode} />
      </Suspense>

      {/* Fog */}
      <fog attach="fog" args={[0xe8d8c0, 20, 60]} />
    </>
  );
}

// Loading Component
function Loader() {
  return (
    <Html center>
      <div style={{ color: "#6a6560", fontSize: "18px" }}>
        Loading...
      </div>
    </Html>
  );
}

// Main Product Browser
interface ProductBrowserProps {
  product: ProductData;
  onNext: () => void;
  onPrev: () => void;
}

function ProductBrowser({ product, onNext, onPrev }: ProductBrowserProps) {
  return (
    <div style={styles.container}>
      {/* Product Info Card */}
      <div style={styles.productCard}>
        <span style={styles.badge}>Curated</span>
        <h1 style={styles.title}>{product.title}</h1>
        <p style={styles.description}>{product.description}</p>
        <div style={styles.controlsHint}>Drag to Rotate • Scroll to Zoom</div>
      </div>

      {/* Navigation Arrows */}
      <div style={styles.navArrows}>
        <button style={styles.arrow} onClick={onPrev}>
          ←
        </button>
        <button style={styles.arrow} onClick={onNext}>
          →
        </button>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={styles.canvas}
      >
        <color attach="background" args={[0xe8d8c0]} />
        <Suspense fallback={<Loader />}>
          <Scene product={product} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Sample Products
const sampleProducts: ProductData[] = [
  {
    id: 1,
    title: "Geometric Cube",
    description: "A simple rotating cube rendered in deep blue with metallic finish.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x4a90e2,
        metalness: 0.3,
        roughness: 0.4
      });
      const cube = new THREE.Mesh(geometry, material);
      group.add(cube);
      return group;
    `,
  },
  {
    id: 2,
    title: "Golden Torus Knot",
    description: "A mathematical marvel rendered in brushed gold with complex topology.",
    aiCode: `
      const group = new THREE.Group();
      const geo = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32);
      const mat = new THREE.MeshPhysicalMaterial({ 
        color: 0xdfa855, 
        roughness: 0.15,
        metalness: 0.6,
        clearcoat: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      return group;
    `,
  },
  {
    id: 3,
    title: "Crimson Sphere",
    description: "A smooth metallic sphere with high reflectivity in rich crimson.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.SphereGeometry(1.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xe74c3c,
        metalness: 0.8,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);
      return group;
    `,
  },
  {
    id: 4,
    title: "Emerald Dodecahedron",
    description: "A crystalline dodecahedron in vibrant emerald green.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.DodecahedronGeometry(1.3);
      const material = new THREE.MeshPhysicalMaterial({ 
        color: 0x2ecc71,
        metalness: 0.4,
        roughness: 0.3,
        clearcoat: 0.8
      });
      const dodeca = new THREE.Mesh(geometry, material);
      group.add(dodeca);
      return group;
    `,
  },
  {
    id: 5,
    title: "Purple Cone",
    description: "An elegant cone structure with gradient-like purple finish.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.ConeGeometry(1.2, 2.5, 32);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x9b59b6,
        metalness: 0.5,
        roughness: 0.4
      });
      const cone = new THREE.Mesh(geometry, material);
      group.add(cone);
      return group;
    `,
  },
  {
    id: 6,
    title: "Orange Octahedron",
    description: "A striking octahedron with matte orange surface.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.OctahedronGeometry(1.4);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xe67e22,
        metalness: 0.2,
        roughness: 0.7
      });
      const octa = new THREE.Mesh(geometry, material);
      group.add(octa);
      return group;
    `,
  },
  {
    id: 7,
    title: "Teal Torus",
    description: "A classic torus ring in smooth teal with subtle metallic sheen.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
      const material = new THREE.MeshPhysicalMaterial({ 
        color: 0x1abc9c,
        metalness: 0.6,
        roughness: 0.25,
        clearcoat: 0.5
      });
      const torus = new THREE.Mesh(geometry, material);
      group.add(torus);
      return group;
    `,
  },
  {
    id: 8,
    title: "Silver Icosahedron",
    description: "A geometric icosahedron with mirror-like silver coating.",
    aiCode: `
      const group = new THREE.Group();
      const geometry = new THREE.IcosahedronGeometry(1.3);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xbdc3c7,
        metalness: 0.9,
        roughness: 0.1
      });
      const icosa = new THREE.Mesh(geometry, material);
      group.add(icosa);
      return group;
    `,
  },
];

// Main App Component
export default function ScenePage() {
  const [storefrontData, setStorefrontData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const storefrontUrl = "w7vgar-u1.myshopify.com";
    const accessToken = "0a80911fde80bbbb611d613777e992ab";

    const fetchStorefrontData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        console.log("Fetching storefront data from Shopify...");

        // Fetch products from Shopify Storefront API
        const shopifyResponse = await fetch(
          `https://${storefrontUrl}/api/2026-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Storefront-Access-Token": accessToken,
            },
            body: JSON.stringify({
              query: `
                query GetProducts {
                  products(first: 10) {
                    edges {
                      node {
                        id
                        title
                        description
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              `,
              variables: {},
            }),
          }
        );

        if (!shopifyResponse.ok) {
          throw new Error(`Shopify API error! status: ${shopifyResponse.status}`);
        }

        const shopifyData = await shopifyResponse.json();
        console.log("Shopify response:", shopifyData);

        if (!shopifyData?.data?.products?.edges) {
          throw new Error(
            `Invalid Shopify response structure: ${JSON.stringify(shopifyData)}`
          );
        }

        // Process each product and generate 3D models
        const processedProducts: ProductData[] = [];
        let counter = 1;

        for (const item of shopifyData.data.products.edges) {
          const product = item.node;
          console.log(`Processing product ${counter}:`, product.title);

          try {
            // Map Shopify product to backend format
            const productData = {
              id: product.id,
              title: product.title,
              description: product.description,
              featured_image: product.featuredImage,
            };

            // Call your backend to generate 3D model
            // Replace these with your actual API functions
            const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-product-3d`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({"product_data": productData}),
            }).then(res => res.json());

            console.log(`Backend response for ${product.title}:`, backendResponse);

            // Poll for task completion
            const taskId = backendResponse.task_id;
            let generatedResponse = null;
            let attempts = 0;
            const maxAttempts = 30;

            while (attempts < maxAttempts) {
              const pollResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/task-result/${taskId}`)
                .then(res => res.json());

              if (pollResponse.status === 'success') {
                generatedResponse = pollResponse;
                break;
              } else if (pollResponse.status === 'failed') {
                throw new Error('3D generation failed');
              }

              // Wait 2 seconds before next poll
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
            }

            if (!generatedResponse) {
              throw new Error('3D generation timeout');
            }

            console.log(`Generated 3D model for ${product.title}`);

            // Extract AI code from response
            let aiCode = '';
            if (generatedResponse?.metadata && typeof generatedResponse.metadata === 'string') {
              aiCode = generatedResponse.metadata;
            } else if (generatedResponse?.result?.metadata) {
              aiCode = generatedResponse.result.metadata;
            }

            processedProducts.push({
              id: counter,
              title: product.title,
              description: product.description || 'No description available',
              aiCode: aiCode,
            });

            counter++;
          } catch (productError) {
            console.error(`Error processing product ${product.title}:`, productError);
            
            // Add fallback product with error state
            processedProducts.push({
              id: counter,
              title: product.title,
              description: product.description || 'No description available',
              aiCode: '', // Will show loading/error state
            });
            counter++;
          }
        }

        console.log(`Successfully processed ${processedProducts.length} products`);
        setStorefrontData(processedProducts);

      } catch (error) {
        console.error('Error fetching storefront data:', error);
        setFetchError(error instanceof Error ? error.message : 'Failed to load products');

        // Fallback to sample data
        console.log('Using sample data as fallback');
        setStorefrontData(sampleProducts);
      } finally {
        setLoading(false);
      }
    };
    console.log(storefrontUrl && accessToken)
    if (storefrontUrl && accessToken) {
      fetchStorefrontData();
    }
  }, []);

  if (loading || storefrontData.length === 0) {
    return (
      <div style={styles.loading}>
        {fetchError ? (
          <>
            <div style={{ color: '#e74c3c', marginBottom: '10px' }}>
              ⚠️ {fetchError}
            </div>
            <div style={{ fontSize: '14px', color: '#95a5a6' }}>
              Using sample data
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }}>Loading storefront data...</div>
            <div style={{ fontSize: '14px', color: '#95a5a6' }}>
              Fetching products and generating 3D models...
            </div>
          </>
        )}
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % storefrontData.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + storefrontData.length) % storefrontData.length);
  };

  return (
    <main>
      <ProductBrowser
        product={storefrontData[currentIndex]}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </main>
  );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  productCard: {
    position: "absolute",
    top: "50%",
    left: "60px",
    transform: "translateY(-50%)",
    width: "340px",
    backgroundColor: "rgba(248, 245, 240, 0.65)",
    backdropFilter: "blur(20px)",
    padding: "40px",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    zIndex: 100,
    boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
    color: "#333",
    pointerEvents: "none",
  },
  badge: {
    color: "#9c8a76",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase",
    border: "1px solid #9c8a76",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "inline-block",
  },
  title: {
    margin: "20px 0 10px 0",
    fontSize: "32px",
    fontFamily: "serif",
    fontWeight: "500",
    color: "#2a2520",
  },
  description: {
    color: "#6a6560",
    lineHeight: "1.6",
    fontSize: "15px",
    fontWeight: "400",
  },
  controlsHint: {
    marginTop: "30px",
    fontSize: "10px",
    color: "#a89e95",
    borderTop: "1px solid rgba(0,0,0,0.05)",
    paddingTop: "20px",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
  },
  navArrows: {
    position: "absolute",
    bottom: "60px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "20px",
    zIndex: 100,
  },
  arrow: {
    backgroundColor: "#fff",
    border: "1px solid rgba(0,0,0,0.05)",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    color: "#333",
    transition: "all 0.2s ease",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#6a6560",
  },
};