class ProductData(BaseModel):
    """Product data for 3D generation."""

    title: str
    description: Optional[str] = None
    product_type: Optional[str] = None
    tags: Optional[list[str]] = None
    featured_image: str
    image_base64: Optional[str] = None
    id: Optional[str] = None


class ShopTheme(BaseModel):
    """Shop theme configuration."""

    style: Optional[str] = "modern"
    colors: Optional[Dict[str, str]] = None


class GenerateProduct3DRequest(BaseModel):
    """Request to generate a 3D product visualization."""

    product_data: ProductData
    shop_theme: Optional[ShopTheme] = None
    max_tokens: Optional[int] = 4096
    temperature: Optional[float] = 0.7


class TaskResponse(BaseModel):
    """Response with task information."""

    task_id: str
    status: str
    message: str


class TaskResultResponse(BaseModel):
    """Response with task result."""

    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None