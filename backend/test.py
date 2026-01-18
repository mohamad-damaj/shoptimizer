import base64
import re
import time

import requests

from backend.claude.scene_generation import (
    ShopifyProductTo3DTask,
    ShopifySceneGenerationTask,
)
from backend.utils.redis import redis_service


def extract_javascript_code(metadata_string):
    # This regex looks for content between ```javascript and ```
    pattern = r"```javascript\n(.*?)```"
    match = re.search(pattern, metadata_string, re.DOTALL)

    if match:
        return match.group(1).strip()

    # Fallback: if no tags found, return the original string
    # (or handle it as an error)
    return metadata_string.strip()


image_url = (
    "https://www.houseplant.com/cdn/shop/files/Amberlifestyle_1512x.png?v=1737983509"
)

response = requests.get(image_url)
response.raise_for_status()

encoded_string = base64.b64encode(response.content).decode("utf-8")

products_dict = {"featured_image": image_url, "image_base64": encoded_string}

result = ShopifyProductTo3DTask.apply_async(args=(1, products_dict))

while not result.ready():
    print("Task is still processing... (polling)")
    time.sleep(5)

final = result.result

raw_code = final["metadata"]


js_code = extract_javascript_code(raw_code)

breakpoint()
print("--- Extracted JS Code ---")
print(js_code[:200] + "...")  # Preview

# result = ShopifyProductTo3DTask.run(1, products_dict)
# print(result)
