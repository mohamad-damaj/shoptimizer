from fastapi import APIRouter

router = APIRouter()

# Returns product code snippets presented in 3d form in threeJS
@router.post("/generate_product")
async def generate_product_3d():
    return {"message": "3D product generation endpoint"}
