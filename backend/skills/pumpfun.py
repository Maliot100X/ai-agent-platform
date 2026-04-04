"""PumpFun API integration skill for Solana meme token trading.

PumpFun is the leading Solana token launchpad. This skill fetches:
- New token launches
- Token graduation status (bonding curve -> Raydium)
- Token metadata and trading data
- King of the Hill tokens
- Trending tokens

Free public endpoints:
- https://frontend-api-v3.pump.fun (main API)
- https://client-api-2-74b1891ee9f9.herokuapp.com (client API)
"""

import httpx
import structlog

from .base import BaseSkill, SkillResult

logger = structlog.get_logger()

PUMPFUN_API = "https://frontend-api-v3.pump.fun"
PUMPFUN_CLIENT = "https://client-api-2-74b1891ee9f9.herokuapp.com"


class PumpFunSkill(BaseSkill):
    """Fetch PumpFun token data - new launches, trending, graduated tokens."""

    name = "pumpfun"
    description = (
        "Fetch PumpFun Solana meme token data: new launches, trending tokens, "
        "graduation status, bonding curve progress, and king of the hill tokens"
    )
    version = "1.0.0"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "new_tokens",
                        "trending",
                        "king_of_hill",
                        "token_info",
                        "graduated",
                        "search",
                    ],
                    "description": "Action to perform",
                },
                "token_address": {
                    "type": "string",
                    "description": "Token mint address (for token_info action)",
                },
                "query": {
                    "type": "string",
                    "description": "Search query (for search action)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 20,
                },
            },
            "required": ["action"],
        }

    async def execute(
        self,
        action: str = "trending",
        token_address: str | None = None,
        query: str | None = None,
        limit: int = 20,
        **kwargs,
    ) -> SkillResult:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if action == "new_tokens":
                    return await self._get_new_tokens(client, limit)
                elif action == "trending":
                    return await self._get_trending(client, limit)
                elif action == "king_of_hill":
                    return await self._get_king_of_hill(client, limit)
                elif action == "token_info" and token_address:
                    return await self._get_token_info(client, token_address)
                elif action == "graduated":
                    return await self._get_graduated(client, limit)
                elif action == "search" and query:
                    return await self._search_tokens(client, query, limit)
                else:
                    return SkillResult(
                        success=False,
                        error=f"Invalid action '{action}' or missing required params",
                    )
        except Exception as e:
            logger.error("pumpfun_error", action=action, error=str(e))
            return SkillResult(success=False, error=str(e))

    async def _get_new_tokens(self, client: httpx.AsyncClient, limit: int) -> SkillResult:
        """Fetch newly created tokens on PumpFun."""
        resp = await client.get(
            f"{PUMPFUN_API}/coins",
            params={"offset": 0, "limit": limit, "sort": "created_timestamp", "order": "DESC", "includeNsfw": "false"},
        )
        resp.raise_for_status()
        tokens = resp.json()
        return SkillResult(
            success=True,
            data=[_format_token(t) for t in tokens[:limit]],
            metadata={"action": "new_tokens", "count": len(tokens[:limit])},
        )

    async def _get_trending(self, client: httpx.AsyncClient, limit: int) -> SkillResult:
        """Fetch trending tokens sorted by market cap."""
        resp = await client.get(
            f"{PUMPFUN_API}/coins",
            params={"offset": 0, "limit": limit, "sort": "market_cap", "order": "DESC", "includeNsfw": "false"},
        )
        resp.raise_for_status()
        tokens = resp.json()
        return SkillResult(
            success=True,
            data=[_format_token(t) for t in tokens[:limit]],
            metadata={"action": "trending", "count": len(tokens[:limit])},
        )

    async def _get_king_of_hill(self, client: httpx.AsyncClient, limit: int) -> SkillResult:
        """Fetch King of the Hill tokens (highest bonding curve progress)."""
        resp = await client.get(
            f"{PUMPFUN_API}/coins/king-of-the-hill",
            params={"includeNsfw": "false"},
        )
        resp.raise_for_status()
        data = resp.json()
        tokens = data if isinstance(data, list) else [data] if data else []
        return SkillResult(
            success=True,
            data=[_format_token(t) for t in tokens[:limit]],
            metadata={"action": "king_of_hill", "count": len(tokens[:limit])},
        )

    async def _get_token_info(self, client: httpx.AsyncClient, address: str) -> SkillResult:
        """Fetch detailed info for a specific token."""
        resp = await client.get(f"{PUMPFUN_API}/coins/{address}")
        resp.raise_for_status()
        token = resp.json()
        return SkillResult(
            success=True,
            data=_format_token_detail(token),
            metadata={"action": "token_info", "address": address},
        )

    async def _get_graduated(self, client: httpx.AsyncClient, limit: int) -> SkillResult:
        """Fetch tokens that have graduated from bonding curve to Raydium."""
        resp = await client.get(
            f"{PUMPFUN_API}/coins",
            params={"offset": 0, "limit": limit, "sort": "market_cap", "order": "DESC", "includeNsfw": "false", "complete": "true"},
        )
        resp.raise_for_status()
        tokens = resp.json()
        return SkillResult(
            success=True,
            data=[_format_token(t) for t in tokens[:limit]],
            metadata={"action": "graduated", "count": len(tokens[:limit])},
        )

    async def _search_tokens(self, client: httpx.AsyncClient, query: str, limit: int) -> SkillResult:
        """Search for tokens by name or symbol."""
        resp = await client.get(
            f"{PUMPFUN_API}/coins",
            params={"offset": 0, "limit": limit, "sort": "market_cap", "order": "DESC", "includeNsfw": "false", "searchTerm": query},
        )
        resp.raise_for_status()
        tokens = resp.json()
        return SkillResult(
            success=True,
            data=[_format_token(t) for t in tokens[:limit]],
            metadata={"action": "search", "query": query, "count": len(tokens[:limit])},
        )


def _format_token(t: dict) -> dict:
    """Format a PumpFun token for display."""
    return {
        "mint": t.get("mint", ""),
        "name": t.get("name", "Unknown"),
        "symbol": t.get("symbol", "???"),
        "description": (t.get("description") or "")[:200],
        "image_uri": t.get("image_uri", ""),
        "market_cap": t.get("usd_market_cap", 0),
        "virtual_sol_reserves": t.get("virtual_sol_reserves", 0),
        "virtual_token_reserves": t.get("virtual_token_reserves", 0),
        "complete": t.get("complete", False),
        "reply_count": t.get("reply_count", 0),
        "creator": t.get("creator", ""),
        "created_timestamp": t.get("created_timestamp", 0),
        "raydium_pool": t.get("raydium_pool"),
        "king_of_the_hill_timestamp": t.get("king_of_the_hill_timestamp"),
        "website": t.get("website"),
        "twitter": t.get("twitter"),
        "telegram": t.get("telegram"),
    }


def _format_token_detail(t: dict) -> dict:
    """Format detailed token info."""
    base = _format_token(t)
    base.update({
        "bonding_curve": t.get("bonding_curve", ""),
        "associated_bonding_curve": t.get("associated_bonding_curve", ""),
        "total_supply": t.get("total_supply", 0),
        "is_currently_live": t.get("is_currently_live", False),
        "nsfw": t.get("nsfw", False),
    })
    return base
