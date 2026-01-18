"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useSearchParams } from "next/navigation";
import { GetStorefrontData } from "@/utils/shopifyGet";
import { STOREFRONT_PRODUCTS_QUERY } from "@/utils/queries";
import { PollTaskId, GenerateProduct3D } from "@/utils/backendClient";
import { OutputFormat } from "@/utils/types";

// types
interface ProductData {
  id: number;
  title: string;
  description: string;
  aiCode: string;
}

interface ProductBrowserProps {
  product: ProductData;
  onNext: () => void;
  onPrev: () => void;
}

// 3d viewer child
const ProductBrowser: React.FC<ProductBrowserProps> = ({
  product,
  onNext,
  onPrev,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const aiModelRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // setting scene up
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const bgColor = new THREE.Color(0xe8d8c0);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(bgColor, 20, 60);

    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(-0.2, 7.93, 20.7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2.5, 0);
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.update();

    // 2. LIGHTING
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff0dd, 1.8);
    keyLight.position.set(10, 20, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.SpotLight(0xddeeff, 0.8);
    fillLight.position.set(-15, 10, 5);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xffffff, 1.2);
    rimLight.position.set(0, 15, -20);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // 3. BACKGROUND DECOR
    const bgGroup = new THREE.Group();
    const matArch = new THREE.MeshPhysicalMaterial({
      color: 0xcba987,
      roughness: 0.9,
    });
    const matSphere1 = new THREE.MeshPhysicalMaterial({
      color: 0xdba392,
      roughness: 0.8,
    });
    const matSphere2 = new THREE.MeshPhysicalMaterial({
      color: 0xc9b891,
      roughness: 0.7,
    });

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(8, 0.5, 16, 100),
      matArch,
    );
    torus.position.set(0, 5, -15);
    torus.rotation.x = Math.PI / 8;
    bgGroup.add(torus);

    const sphere1 = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      matSphere1,
    );
    sphere1.position.set(-12, 2, -10);
    bgGroup.add(sphere1);

    const sphere2 = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      matSphere2,
    );
    sphere2.position.set(12, 6, -8);
    bgGroup.add(sphere2);
    scene.add(bgGroup);

    // 4. FLOOR
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0d0b8,
      metalness: 0.1,
      roughness: 0.2,
      clearcoat: 0.1,
      reflectivity: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 5. CONTAINER (GLASS)
    const containerGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.2, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    containerGroup.add(base);

    const glassGeo = new THREE.CylinderGeometry(2.5, 2.5, 5.2, 64, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.98,
      thickness: 0.5,
      ior: 1.45,
      roughness: 0.02,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 2.7;
    glass.renderOrder = 2; // RENDER AFTER OBJECT
    containerGroup.add(glass);
    scene.add(containerGroup);

    // 6. ANIMATION
    const animate = () => {
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);
      const time = Date.now() * 0.0005;
      sphere1.position.y = 2 + Math.sin(time) * 0.5;
      sphere2.position.y = 6 + Math.cos(time * 0.8) * 0.5;
      controls.update();
      rendererRef.current.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rendererRef.current?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // --- HYDRATION: LISTEN FOR 'product.aiCode' CHANGE ---
  useEffect(() => {
    if (product.aiCode && sceneRef.current) {
      if (aiModelRef.current) sceneRef.current.remove(aiModelRef.current);

      try {
        const creatorFunction = new Function("THREE", product.aiCode);
        const newModel = creatorFunction(THREE);

        newModel.traverse((node) => {
          if (node.isMesh) {
            node.geometry.computeBoundingSphere();
            node.geometry.computeBoundingBox();
            node.frustumCulled = false;
            node.castShadow = true;
            node.receiveShadow = true;
            node.renderOrder = 1; // we render object before glass
            if (node.material) {
              node.material.side = THREE.DoubleSide;
              if (node.material.transparent) {
                node.material.depthWrite = true;
              }
            }
          }
        });

        newModel.position.set(0, 2.5, 0);
        sceneRef.current.add(newModel);
        aiModelRef.current = newModel;
      } catch (err) {
        console.error("3D Hydration failed:", err);
      }
    }
  }, [product.aiCode]); // <--- Only runs when the code string changes

  return (
    <div style={styles.container}>
      <div style={styles.productCard}>
        <span style={styles.badge}>Curated</span>
        <h1 style={styles.title}>{product.title}</h1>
        <p style={styles.description}>{product.description}</p>
        <div style={styles.controlsHint}>Drag to Rotate • Scroll to Zoom</div>
      </div>

      <div style={styles.navArrows}>
        <button style={styles.arrow} onClick={onPrev}>
          ←
        </button>
        <button style={styles.arrow} onClick={onNext}>
          →
        </button>
      </div>

      <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />
    </div>
  );
};

// --- PARENT COMPONENT: DATA MANAGER ---
export default function ScenePage() {
  //   const searchParams = useSearchParams();
  useEffect(() => {
    const storefrontUrl = "w7vgar-u1.myshopify.com";
    const accessToken = "0a80911fde80bbbb611d613777e992ab";
    console.log("Storefront URL:", storefrontUrl);
    console.log("Access Token:", accessToken);
    const fetchStorefrontData = async () => {
      try {
        setLoading(true);

        console.log("Fetching storefront data...");
        // Fetch data from backend or directly from Shopify Storefront API
        const response = await fetch(
          `https://${storefrontUrl}/api/2026-01/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Storefront-Access-Token": accessToken,
            },
            body: JSON.stringify({
              query: STOREFRONT_PRODUCTS_QUERY,
              variables: {},
            }),
          },
        )
          .then((res) => res.json())
          .catch((error) => {
            console.error("Error fetching Shopify data:", error);
            throw error;
          });

        // should have a little more error handling here

        console.log("Storefront response:", response);
        if (!response?.data?.products?.edges) {
          throw new Error(
            `Invalid response structure: ${JSON.stringify(response)}`,
          );
        }
        // setStorefrontData(response);

        // Loop over items and fetch 3D counterparts using API
        const mutated_response = [];
        let counter = 1;
        for (const item of response.data.products.edges) {
          const product = item.node;
          const backendResponse = await GenerateProduct3D(
            mapToShopifyProductData(product),
          );
          const generatedResponse = await PollTaskId(backendResponse.task_id);
          mutated_response.push(
            mapToOutputFormat(counter, generatedResponse, backendResponse),
          );
          counter++;
        }
        setStorefrontData(mutated_response);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching storefront data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (storefrontUrl && accessToken) {
      fetchStorefrontData();
    }
  }, []);

  const [storefrontData, setStorefrontData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loading) {
    return <div>Loading storefront data...</div>;
  }

  // --- NAVIGATION LOGIC ---
  // TODO: Should probably take in an argument
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % storefrontData.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + storefrontData.length) % storefrontData.length,
    );
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

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#e8d8c0",
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
};

function mapToOutputFormat(
  id: number,
  generatedResponse: any,
  originalResponse: any,
): ProductData {
  return {
    id,
    title: originalResponse.title,
    description: originalResponse.description,
    aiCode: generatedResponse.metadata,
  };
}

function mapToShopifyProductData(product) {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    featured_image: product.featuredImage,
  };
}
