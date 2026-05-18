import redis.asyncio as aioredis
import time
import os
from fastapi import HTTPException, Request

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Rate limit config per client
RATE_LIMITS = {
    "default": {"requests": 60, "window": 60},     # 60 req/min
    "submit":  {"requests": 20, "window": 60},     # 20 task submissions/min
    "burst":   {"requests": 10, "window": 10},     # 10 req/10sec burst protection
}


class RateLimiter:
    def __init__(self):
        self.redis: aioredis.Redis = None

    async def connect(self):
        self.redis = await aioredis.from_url(REDIS_URL, decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def is_allowed(self, client_id: str, limit_type: str = "default") -> tuple[bool, dict]:
        """Sliding window rate limiter."""
        config = RATE_LIMITS.get(limit_type, RATE_LIMITS["default"])
        max_requests = config["requests"]
        window = config["window"]

        now = time.time()
        key = f"rate_limit:{limit_type}:{client_id}"
        window_start = now - window

        pipe = self.redis.pipeline()
        # Remove old entries outside window
        pipe.zremrangebyscore(key, 0, window_start)
        # Count requests in window
        pipe.zcard(key)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Set expiry
        pipe.expire(key, window + 1)
        results = await pipe.execute()

        current_count = results[1]
        remaining = max(0, max_requests - current_count - 1)
        reset_at = int(now + window)

        info = {
            "limit": max_requests,
            "remaining": remaining,
            "reset_at": reset_at,
            "window_seconds": window,
        }

        return current_count < max_requests, info


rate_limiter = RateLimiter()


def get_client_id(request: Request) -> str:
    """Extract client ID from API key header or fall back to IP."""
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"key:{api_key}"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    return f"ip:{request.client.host}"


async def check_rate_limit(request: Request, limit_type: str = "default"):
    """Dependency for rate limiting."""
    client_id = get_client_id(request)
    allowed, info = await rate_limiter.is_allowed(client_id, limit_type)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "limit": info["limit"],
                "window_seconds": info["window_seconds"],
                "reset_at": info["reset_at"],
            },
            headers={
                "X-RateLimit-Limit": str(info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(info["reset_at"]),
                "Retry-After": str(info["window_seconds"]),
            },
        )
    return client_id, info