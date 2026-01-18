"""FastAPI routes for Shoptimizer backend."""

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status

from app.claude.scene_generation import ShopifyProductTo3DTask
from app.utils.redis import redis_service
from app.api.models import (
    GenerateProduct3DRequest,
    TaskResponse,
    TaskResultResponse,
)



router = APIRouter(prefix="/api", tags=["generation"])


@router.post(
    "/generate-product-3d",
    response_model=TaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_product_3d(request: GenerateProduct3DRequest) -> TaskResponse:
    """
    Queue a task to generate a 3D product visualization.

    This endpoint accepts product data and queues a Celery task that will:
    1. Use Google's Gemini API to analyze the product image
    2. Generate Three.js code for a 3D representation
    3. Store the result in Redis for retrieval

    Args:
        request: The request containing product data and optional theme

    Returns:
        TaskResponse with task_id for polling the result

    Raises:
        HTTPException: If task queuing fails
    """
    try:
        # Generate a unique task ID
        task_id = str(uuid.uuid4())

        # Prepare product data dict
        product_dict = {
            "id": request.product_data.id or task_id,
            "title": request.product_data.title,
            "description": request.product_data.description or "",
            "product_type": request.product_data.product_type or "",
            "tags": request.product_data.tags or [],
            "image_url": request.product_data.featured_image.url,
        }

        # Prepare shop theme dict
        shop_theme = None
        if request.shop_theme:
            shop_theme = {
                "style": request.shop_theme.style,
                "colors": request.shop_theme.colors or {},
            }

        # Create task instance and queue it
        task = ShopifyProductTo3DTask
        celery_task = task.apply_async(
            args=(
                task_id,
                product_dict,
                shop_theme,
                request.max_tokens,
                request.temperature,
            )
        )

        return TaskResponse(
            task_id=task_id,
            status="queued",
            message=f"Task {task_id} queued for processing",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue task: {str(e)}",
        )

# SSE endpoint for frontend to retrieve value from Redis as workers
@router.get("/task-stream/{task_id}")
async def stream_task_result(task_id: str):
    """
    Stream task results via Server-Sent Events (SSE).
    
    Client connects once and receives real-time updates as task progresses.
    Connection closes automatically when task completes or fails.
    """
    async def event_generator():
        # Poll Redis, but only send updates when status changes
        previous_status = None
        max_wait_time = 3600  # 1 hour timeout
        start_time = asyncio.get_event_loop().time()
        
        while True:
            # Timeout check
            if asyncio.get_event_loop().time() - start_time > max_wait_time:
                yield f"data: {json.dumps({'status': 'timeout', 'message': 'Task timed out'})}\n\n"
                break
            
            try:
                # Get current result from Redis
                result_json = redis_service.get_value(f"task_result:{task_id}")
                
                if result_json:
                    result = json.loads(result_json)
                    current_status = result.get("status")
                    
                    # Only send if status changed or first time
                    if current_status != previous_status:
                        yield f"data: {json.dumps(result)}\n\n"
                        previous_status = current_status
                        
                        # Close connection when task is done
                        if current_status in ["completed", "failed"]:
                            break
                else:
                    # Task not found yet (might be queuing)
                    if previous_status is None:
                        yield f"data: {json.dumps({'status': 'queued', 'message': 'Task queued, processing...', 'task_id': task_id})}\n\n"
                        previous_status = "queued"
                
                # Wait before checking again
                await asyncio.sleep(0.5)
                
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
                break
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        }
    )


@router.get("/task-result/{task_id}", response_model=TaskResultResponse)
async def get_task_result(task_id: str) -> TaskResultResponse:
    """
    Retrieve the result of a 3D product generation task.

    Args:
        task_id: The ID of the task to retrieve

    Returns:
        TaskResultResponse with the task status and result (if available)

    Raises:
        HTTPException: If task_id is invalid
    """
    try:
        # Try to retrieve the result from Redis
        result_json = redis_service.get_value(task_id)

        if result_json:
            import json

            result = json.loads(result_json)
            return TaskResultResponse(
                task_id=task_id,
                status=result.get("status", "unknown"),
                result=result,
            )

        # If not found, return pending status
        return TaskResultResponse(
            task_id=task_id,
            status="pending",
            message="Task is still processing or not found",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve task result: {str(e)}",
        )



@router.delete("/task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_task(task_id: str) -> None:
    """
    Cancel a queued or running task.

    Args:
        task_id: The ID of the task to cancel

    Raises:
        HTTPException: If task cancellation fails
    """
    try:
        from app.utils.celery_app import celery_app

        # Revoke the Celery task
        celery_app.control.revoke(task_id, terminate=True)

        # Clean up Redis data
        redis_service.delete_value(f"task_result:{task_id}")

        return None

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel task: {str(e)}",
        )


@router.get("/health", tags=["health"])
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint.

    Returns:
        Status of the API
    """
    try:
        # Test Redis connection
        redis_service.client.ping()
        redis_status = "ok"
    except Exception:
        redis_status = "error"

    return {
        "status": "ok",
        "redis": redis_status,
    }
