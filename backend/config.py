MAX_TOKENS = 409600
DEFAULT_TEMP = 0
import asyncio
from typing import Any, Dict, Optional, Protocol

from app.utils.redis import redis_service
from celery import Task


class AsyncClient(Protocol):

    async def send_message(self, message_params: Dict[str, Any]) -> Any: ...


class AsyncTask(Task):
    """Base Celery tasks class using async functions."""

    _client = None

    @property
    async def client(self) -> AsyncClient: ...

    def run(self, *args, **kwargs):
        return asyncio.run(self._run_async(*args, **kwargs))

    async def _run_async(self, *args, **kwargs): ...


class PromptTask(AsyncTask):

    async def _run_async(
        self,
        task_id: str,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens=MAX_TOKENS,
        temperature=DEFAULT_TEMP,
        additional_params=None,
    ):
        try:
            redis_service.publish_start_event(task_id)

            # message parameters
            message_params = self.prepare_message_params(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                additional_params=additional_params,
            )

            client = await self.client

            response = await self.send_message(client, message_params)

            content = self.extract_content(response)

            final_response = self.prepare_final_response(task_id, response, content)

            redis_service.publish_complete_event(task_id, final_response)

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

    def prepare_message_params(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = MAX_TOKENS,
        temperature: float = DEFAULT_TEMP,
        additional_params=None,
    ) -> Dict[str, Any]:
        """Prepare the message parameters for the AI service."""
        raise NotImplementedError

    async def send_message(self, client: Any, message_params: Dict[str, Any]) -> Any:
        """Send the message to the AI service.

        This should be implemented by subclasses to handle the specific API call.
        """
        raise NotImplementedError

    def extract_content(self, response: Any) -> str:
        """Extract the content from the AI service response.

        This should be implemented by subclasses to parse the response format.
        """
        raise NotImplementedError

    def prepare_final_response(
        self, task_id: str, response: Any, content: str
    ) -> Dict[str, Any]:
        """Prepare the final response with metadata.

        This should be implemented by subclasses to include service-specific metadata.
        """
        raise NotImplementedError
