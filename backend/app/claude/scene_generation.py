import asyncio
import base64
import json
from io import BytesIO
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from PIL import Image

from app.claude.prompt import base_prompt, system_prompt_3d_obj
from app.config import DEFAULT_TEMP, MAX_TOKENS, AsyncAITask, GenericPromptTask
from app.utils.celery_app import celery_app
from app.utils.settings import settings
from app.utils.redis import redis_service

# Default model configuration for Gemini
DEFAULT_MODEL = "gemini-3-flash-preview"


# Create Gemini client
async def get_gemini_client():
    client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return client


class AsyncGeminiTask(AsyncAITask):
    """Base class for Gemini Celery tasks that use async functions."""

    _client = None

    @property
    async def client(self):
        if self._client is None:
            self._client = await get_gemini_client()
        return self._client


class ShopifyProductTo3DTask(GenericPromptTask, AsyncGeminiTask):
    """Task to generate 3D product visualizations from Shopify product data."""

    async def _run_async(
        self,
        task_id: str,
        product_data: Dict[str, Any],
        shop_theme: Optional[Dict[str, Any]] = None,
        max_tokens: int = MAX_TOKENS,
        temperature: float = DEFAULT_TEMP,
        additional_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate a 3D product visualization from Shopify product data."""
        try:
            # Publish start event
            redis_service.publish_start_event(task_id)

            # Get the Gemini client
            client = await self.client

            # Extract product information
            product_name = product_data.get("title", "Unknown Product")
            product_description = product_data.get("description", "")
            product_type = product_data.get("product_type", "")
            product_tags = product_data.get("tags", [])
            product_image_url = product_data.get("featured_image", "")

            if not product_image_url:
                print("[ERROR] No image URL provided")
                return {"status": "error", "error": "No image URL provided"}

            # Build the prompt for product generation
            prompt = self._build_product_prompt(
                product_name,
                product_description,
                product_type,
                product_tags,
                shop_theme,
            )

            # Prepare content with product image if available
            contents = [base_prompt]
            if product_image_url and product_data.get("image_base64"):
                try:
                    image = Image.open(
                        BytesIO(base64.b64decode(product_data["image_base64"]))
                    )
                    contents.append(image)
                except Exception as e:
                    print(f"[WARNING] Could not load product image: {str(e)}")

            # Create config for image generation
            config = types.GenerateContentConfig(
                response_modalities=["Text"],
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            # Generate the 3D product visualization
            response = await client.aio.models.generate_content(
                model=DEFAULT_MODEL,
                contents=contents,
                config=config,
                system=prompt
                )

            # Extract any text content
            text_content = response.text if hasattr(response, "text") else ""

            # Prepare the final response
            final_response = {
                "status": "success",
                "product_id": product_data.get("id"),
                "product_name": product_name,
                "metadata": text_content,
                "model": DEFAULT_MODEL,
                "usage": {
                    "input_tokens": getattr(
                        response.usage_metadata, "prompt_token_count", 0
                    ),
                    "output_tokens": getattr(
                        response.usage_metadata, "candidates_token_count", 0
                    ),
                    "total_tokens": getattr(
                        response.usage_metadata, "total_token_count", 0
                    ),
                },
                "task_id": task_id,
            }

            # Publish completion event
            redis_service.publish_complete_event(task_id, final_response)

            # Store the final response in Redis for retrieval
            redis_service.store_response(task_id, final_response)

            return final_response

        except Exception as e:
            error_response = {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "task_id": task_id,
            }

            try:
                redis_service.publish_error_event(task_id, e)
                redis_service.store_response(task_id, error_response)
            except Exception:
                pass

            return error_response

    def _build_product_prompt(
        self,
        product_name: str,
        product_description: str,
        product_type: str,
        product_tags: List[str],
        shop_theme: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Build a detailed prompt for product visualization."""
        theme_style = ""
        if shop_theme:
            colors = shop_theme.get("colors", {})
            style = shop_theme.get("style", "modern")
            theme_style = f"\n\nShop Theme: {style} style with colors {colors}"

            prompt = system_prompt_3d_obj(
                product_name, 
                product_type,
                product_description, 
                product_tags, 
                theme_style
                )


        return prompt

    def run(
        self,
        task_id: str,
        product_data: Dict[str, Any],
        shop_theme: Optional[Dict[str, Any]] = None,
        max_tokens: int = MAX_TOKENS,
        temperature: float = DEFAULT_TEMP,
        additional_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run the task with the given parameters."""
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            self._run_async(
                task_id=task_id,
                product_data=product_data,
                shop_theme=shop_theme,
                max_tokens=max_tokens,
                temperature=temperature,
                additional_params=additional_params,
            )
        )
        return result


class ShopifySceneGenerationTask(GenericPromptTask, AsyncGeminiTask):
    """Task to generate a themed 3D scene for Shopify products."""

    async def _run_async(
        self,
        task_id: str,
        shop_data: Dict[str, Any],
        max_tokens: int = 4096,
        temperature: float = DEFAULT_TEMP,
        additional_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate a themed 3D scene based on Shopify shop data."""
        try:
            # Publish start event
            redis_service.publish_start_event(task_id)

            # Get the Gemini client
            client = await self.client

            # Extract shop information
            shop_name = shop_data.get("name", "Shop")
            shop_description = shop_data.get("description", "")
            theme_colors = shop_data.get("theme", {}).get("colors", {})
            theme_style = shop_data.get("theme", {}).get("style", "modern")
            product_count = shop_data.get("product_count", 1)

            # Build the prompt for scene generation
            prompt = self._build_scene_prompt(
                shop_name, shop_description, theme_colors, theme_style, product_count
            )

            # System prompt for Three.js scene generation
            system_prompt = """You are an expert Three.js developer and 3D scene designer specializing in creating immersive product showcase environments.

Your task is to generate a complete Three.js scene that serves as a beautiful environment for displaying Shopify products in glass containers.

## TECHNICAL REQUIREMENTS:
- Do not import any libraries. They have already been imported (THREE, OrbitControls, etc.)
- Create a complete Three.js scene with camera, renderer, and lighting
- Include OrbitControls for user interaction
- The scene should have designated positions for products in glass containers
- Implement a ground/floor that matches the theme
- Add atmospheric elements (lighting, fog, background) that enhance the theme
- Create an animation loop for any dynamic elements
- Make the scene responsive to container size
- Include proper material setup with realistic textures where appropriate

## SCENE STRUCTURE:
- Create a main display area with multiple product positions
- Each product position should have a glass container (use THREE.CylinderGeometry or custom geometry)
- Glass containers should use transparent materials with proper refraction
- Arrange containers in an aesthetically pleasing layout (grid, circle, or custom based on theme)
- Add ambient lighting and directional lights to highlight products
- Include environmental elements that match the shop's theme

## RESPONSE FORMAT:
Return ONLY valid JavaScript code that creates and animates the Three.js scene.
Include comments explaining major design decisions.
Wrap your entire code in backticks with the javascript identifier: ```javascript"""

            # Create config
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_prompt,
            )

            # Generate the scene code
            response = await client.aio.models.generate_content(
                model=DEFAULT_MODEL, contents=prompt, config=config
            )

            # Extract the generated code
            scene_code = response.text

            # Prepare the final response
            final_response = {
                "status": "success",
                "scene_code": scene_code,
                "shop_name": shop_name,
                "product_positions": product_count,
                "theme": {
                    "style": theme_style,
                    "colors": theme_colors,
                },
                "model": DEFAULT_MODEL,
                "usage": {
                    "input_tokens": getattr(
                        response.usage_metadata, "prompt_token_count", 0
                    ),
                    "output_tokens": getattr(
                        response.usage_metadata, "candidates_token_count", 0
                    ),
                    "total_tokens": getattr(
                        response.usage_metadata, "total_token_count", 0
                    ),
                },
                "task_id": task_id,
            }

            # Publish completion event
            redis_service.publish_complete_event(task_id, final_response)

            # Store the final response in Redis for retrieval
            redis_service.store_response(task_id, final_response)

            return final_response

        except Exception as e:
            error_response = {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "task_id": task_id,
            }

            try:
                redis_service.publish_error_event(task_id, e)
                redis_service.store_response(task_id, error_response)
            except Exception:
                pass

            return error_response

    def _build_scene_prompt(
        self,
        shop_name: str,
        shop_description: str,
        theme_colors: Dict[str, str],
        theme_style: str,
        product_count: int,
    ) -> str:
        """Build a detailed prompt for scene generation."""
        colors_desc = ", ".join([f"{k}: {v}" for k, v in theme_colors.items()])

        prompt = f"""Generate a complete Three.js scene for displaying {product_count} products from "{shop_name}".

Shop Information:
- Name: {shop_name}
- Description: {shop_description}
- Theme Style: {theme_style}
- Theme Colors: {colors_desc}

Scene Requirements:
1. Create {product_count} glass display containers arranged in an aesthetically pleasing layout
2. Each container should be a transparent glass cylinder or dome that can hold a product
3. The glass should have realistic material properties (transparency, refraction, slight tint)
4. Containers should be evenly spaced and positioned to showcase products effectively
5. Include a themed floor/ground that reflects the shop's aesthetic ({theme_style})
6. Add atmospheric lighting that enhances the products and matches the color scheme
7. Include subtle ambient elements (fog, background, decorative elements) that fit the theme
8. Add smooth camera controls using OrbitControls
9. Implement a subtle animation (rotating platform, gentle lighting changes, etc.)
10. Make the scene responsive to different screen sizes

Design Aesthetics:
- Match the {theme_style} style throughout the scene
- Use the shop's color palette: {colors_desc}
- Create a premium, modern feel appropriate for e-commerce
- Balance visual interest with product focus (products should be the stars)
- Include proper shadows and lighting for depth

Technical Implementation:
- Set up camera at an optimal viewing angle
- Use appropriate lighting (ambient + directional/spotlights)
- Create reusable container positions that can be referenced later
- Ensure smooth performance with optimized geometry
- Add resize handling for responsive behavior

Return the complete JavaScript code for this Three.js scene."""

        return prompt

    def run(
        self,
        task_id: str,
        shop_data: Dict[str, Any],
        product_count: int,
        max_tokens: int = 4096,
        temperature: float = DEFAULT_TEMP,
        additional_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run the task with the given parameters."""
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            self._run_async(
                task_id=task_id,
                shop_data=shop_data,
                product_count=product_count,
                max_tokens=max_tokens,
                temperature=temperature,
                additional_params=additional_params,
            )
        )
        return result


# class ShopifyProductIntegrationTask(GenericPromptTask, AsyncGeminiTask):
#     """Task to integrate generated products into the scene."""

#     async def _run_async(
#         self,
#         task_id: str,
#         scene_code: str,
#         products: List[Dict[str, Any]],
#         max_tokens: int = 4096,
#         temperature: float = DEFAULT_TEMP,
#         additional_params: Optional[Dict[str, Any]] = None,
#     ) -> Dict[str, Any]:
#         """Integrate product visualizations into the scene code."""
#         try:
#             # Publish start event
#             redis_service.publish_start_event(task_id)

#             # Get the Gemini client
#             client = await self.client

#             # Build the integration prompt
#             prompt = self._build_integration_prompt(scene_code, products)

#             # System prompt for code integration
#             system_prompt = """You are an expert Three.js developer specializing in integrating 3D assets into existing scenes.

# Your task is to take the base scene code and integrate product images into the glass containers, creating a cohesive 3D product showcase.

# ## INTEGRATION REQUIREMENTS:
# - Preserve the existing scene structure and aesthetic
# - Load product images and create 3D planes/sprites inside each glass container
# - Position products at the center of each container
# - Ensure products are properly scaled to fit within containers
# - Add subtle product-specific lighting or highlights if appropriate
# - Maintain all existing animations and interactions
# - Keep the code clean and well-organized

# ## PRODUCT PLACEMENT:
# - Use THREE.TextureLoader to load product images
# - Create THREE.Plane or THREE.Sprite for each product
# - Position products in the center of their assigned containers
# - Scale products appropriately (not too large or too small)
# - Ensure products face the camera or have slight rotation for visual interest
# - Add subtle glow or highlight effects around products

# ## RESPONSE FORMAT:
# Return the COMPLETE JavaScript code with products integrated.
# Wrap your entire code in backticks with the javascript identifier: ```javascript"""

#             # Create config
#             config = types.GenerateContentConfig(
#                 temperature=temperature,
#                 max_output_tokens=max_tokens,
#                 system_instruction=system_prompt,
#             )

#             # Generate the integrated scene code
#             response = await client.aio.models.generate_content(
#                 model=DEFAULT_MODEL, contents=prompt, config=config
#             )

#             # Extract the generated code
#             integrated_code = response.text

#             # Prepare the final response
#             final_response = {
#                 "status": "success",
#                 "integrated_code": integrated_code,
#                 "products_integrated": len(products),
#                 "model": DEFAULT_MODEL,
#                 "usage": {
#                     "input_tokens": getattr(
#                         response.usage_metadata, "prompt_token_count", 0
#                     ),
#                     "output_tokens": getattr(
#                         response.usage_metadata, "candidates_token_count", 0
#                     ),
#                     "total_tokens": getattr(
#                         response.usage_metadata, "total_token_count", 0
#                     ),
#                 },
#                 "task_id": task_id,
#             }

#             # Publish completion event
#             redis_service.publish_complete_event(task_id, final_response)

#             # Store the final response in Redis for retrieval
#             redis_service.store_response(task_id, final_response)

#             return final_response

#         except Exception as e:
#             error_response = {
#                 "status": "error",
#                 "error": str(e),
#                 "error_type": type(e).__name__,
#                 "task_id": task_id,
#             }

#             try:
#                 redis_service.publish_error_event(task_id, e)
#                 redis_service.store_response(task_id, error_response)
#             except Exception:
#                 pass

#             return error_response

#     def _build_integration_prompt(
#         self, scene_code: str, products: List[Dict[str, Any]]
#     ) -> str:
#         """Build a detailed prompt for product integration."""
#         product_info = []
#         for idx, product in enumerate(products):
#             product_info.append(
#                 f"Product {idx + 1}: {product.get('product_name', 'Unknown')} "
#                 f"(Image: data:image/png;base64,{product.get('generated_images', [{}])[0].get('image_base64', '')[:50]}...)"
#             )

#         products_list = "\n".join(product_info)

#         prompt = f"""Integrate the following products into the existing Three.js scene:

# {products_list}

# Existing Scene Code:
# ```javascript
# {scene_code}
# ```

# Integration Instructions:
# 1. Load each product image using THREE.TextureLoader
# 2. Create a 3D representation for each product (plane or sprite with the product image as texture)
# 3. Position each product in the center of its corresponding glass container
# 4. Ensure products are properly scaled and oriented
# 5. Add any necessary lighting adjustments to highlight the products
# 6. Maintain all existing scene functionality and animations
# 7. Keep the code clean with clear variable names

# Product Positioning:
# - Product images should be centered in each glass container
# - Size products appropriately (roughly 60-70% of container height)
# - Orient products to face the camera or at a slight angle for visual interest
# - Ensure no product clips through the glass

# Return the COMPLETE JavaScript code with all products integrated into the scene."""

#         return prompt

#     def run(
#         self,
#         task_id: str,
#         scene_code: str,
#         products: List[Dict[str, Any]],
#         max_tokens: int = 4096,
#         temperature: float = DEFAULT_TEMP,
#         additional_params: Optional[Dict[str, Any]] = None,
#     ) -> Dict[str, Any]:
#         """Run the task with the given parameters."""
#         loop = asyncio.get_event_loop()
#         result = loop.run_until_complete(
#             self._run_async(
#                 task_id=task_id,
#                 scene_code=scene_code,
#                 products=products,
#                 max_tokens=max_tokens,
#                 temperature=temperature,
#                 additional_params=additional_params,
#             )
#         )
#         return result


# Register the tasks properly with Celery
ShopifyProductTo3DTask = celery_app.register_task(ShopifyProductTo3DTask())
ShopifySceneGenerationTask = celery_app.register_task(ShopifySceneGenerationTask())
# ShopifyProductIntegrationTask = celery_app.register_task(
#     ShopifyProductIntegrationTask()
# )


if __name__ == "__main__":
    prod = ShopifyProductTo3DTask()

    prod.run()
