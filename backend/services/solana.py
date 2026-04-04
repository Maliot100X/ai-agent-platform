"""Solana blockchain utilities - Birdeye, Helius, and wallet analysis.

Integrates:
- Birdeye API v3: Token prices, market data, trending tokens
- Helius RPC: On-chain wallet analysis, transaction history
- DexScreener: DEX pair data
"""

import httpx
import structlog
from backend.config import settings

logger = structlog.get_logger()

BIRDEYE_BASE = "https://public-api.birdeye.so"
HELIUS_RPC = "https://mainnet.helius-rpc.com"
DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex"

# Well-known Solana token addresses
SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"


class BirdeyeClient:
    """Birdeye API v3 client for Solana token data."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.birdeye_api_key
        self.client = httpx.AsyncClient(
            base_url=BIRDEYE_BASE,
            headers={
                "X-API-KEY": self.api_key or "",
                "x-chain": "solana",
            },
            timeout=30.0,
        )

    async def get_token_price(self, address: str) -> dict:
        """Get current token price from Birdeye."""
        try:
            resp = await self.client.get(
                "/defi/v3/token/market-data",
                params={"address": address},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", {})
        except Exception as e:
            logger.error("birdeye_price_error", address=address, error=str(e))
            return {}

    async def get_token_overview(self, address: str) -> dict:
        """Get token overview including metadata."""
        try:
            resp = await self.client.get(
                "/defi/v3/token/overview",
                params={"address": address},
            )
            resp.raise_for_status()
            return resp.json().get("data", {})
        except Exception as e:
            logger.error("birdeye_overview_error", error=str(e))
            return {}

    async def get_trending_tokens(self, limit: int = 20) -> list[dict]:
        """Get trending tokens on Solana."""
        try:
            resp = await self.client.get(
                "/defi/v3/token/trending",
                params={"sort_by": "rank", "sort_type": "asc", "offset": 0, "limit": limit},
            )
            resp.raise_for_status()
            return resp.json().get("data", {}).get("tokens", [])
        except Exception as e:
            logger.error("birdeye_trending_error", error=str(e))
            return []

    async def get_token_security(self, address: str) -> dict:
        """Get token security information."""
        try:
            resp = await self.client.get(
                "/defi/token_security",
                params={"address": address},
            )
            resp.raise_for_status()
            return resp.json().get("data", {})
        except Exception as e:
            logger.error("birdeye_security_error", error=str(e))
            return {}

    async def get_ohlcv(self, address: str, timeframe: str = "15m", limit: int = 50) -> list[dict]:
        """Get OHLCV candle data for a token."""
        try:
            resp = await self.client.get(
                "/defi/ohlcv",
                params={
                    "address": address,
                    "type": timeframe,
                    "time_from": 0,
                    "time_to": 9999999999,
                },
            )
            resp.raise_for_status()
            items = resp.json().get("data", {}).get("items", [])
            return items[-limit:]
        except Exception as e:
            logger.error("birdeye_ohlcv_error", error=str(e))
            return []


class HeliusClient:
    """Helius RPC client for Solana on-chain data."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.helius_api_key
        self.base_url = f"{HELIUS_RPC}/?api-key={self.api_key}" if self.api_key else HELIUS_RPC

    async def get_wallet_assets(self, wallet: str) -> list[dict]:
        """Get all assets in a wallet using Helius DAS API."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    self.base_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": "wallet-assets",
                        "method": "getAssetsByOwner",
                        "params": {
                            "ownerAddress": wallet,
                            "page": 1,
                            "limit": 100,
                            "displayOptions": {"showFungible": True, "showNativeBalance": True},
                        },
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("result", {}).get("items", [])
        except Exception as e:
            logger.error("helius_assets_error", wallet=wallet, error=str(e))
            return []

    async def get_wallet_balance(self, wallet: str) -> dict:
        """Get SOL balance for a wallet."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    self.base_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": "balance",
                        "method": "getBalance",
                        "params": [wallet],
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                lamports = data.get("result", {}).get("value", 0)
                return {"lamports": lamports, "sol": lamports / 1e9}
        except Exception as e:
            logger.error("helius_balance_error", error=str(e))
            return {"lamports": 0, "sol": 0}

    async def get_recent_transactions(self, wallet: str, limit: int = 20) -> list[dict]:
        """Get recent transactions for a wallet."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # First get signatures
                resp = await client.post(
                    self.base_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": "txns",
                        "method": "getSignaturesForAddress",
                        "params": [wallet, {"limit": limit}],
                    },
                )
                resp.raise_for_status()
                return resp.json().get("result", [])
        except Exception as e:
            logger.error("helius_txns_error", error=str(e))
            return []

    async def get_token_accounts(self, wallet: str) -> list[dict]:
        """Get all SPL token accounts for a wallet."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    self.base_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": "tokens",
                        "method": "getTokenAccountsByOwner",
                        "params": [
                            wallet,
                            {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                            {"encoding": "jsonParsed"},
                        ],
                    },
                )
                resp.raise_for_status()
                return resp.json().get("result", {}).get("value", [])
        except Exception as e:
            logger.error("helius_tokens_error", error=str(e))
            return []


class DexScreenerClient:
    """DexScreener client for DEX pair data."""

    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=DEXSCREENER_BASE,
            timeout=30.0,
        )

    async def get_token_pairs(self, address: str) -> list[dict]:
        """Get trading pairs for a token."""
        try:
            resp = await self.client.get(f"/tokens/{address}")
            resp.raise_for_status()
            return resp.json().get("pairs", [])
        except Exception as e:
            logger.error("dexscreener_pairs_error", error=str(e))
            return []

    async def search_pairs(self, query: str) -> list[dict]:
        """Search for trading pairs."""
        try:
            resp = await self.client.get(f"/search?q={query}")
            resp.raise_for_status()
            return resp.json().get("pairs", [])
        except Exception as e:
            logger.error("dexscreener_search_error", error=str(e))
            return []

    async def get_solana_new_pairs(self, limit: int = 20) -> list[dict]:
        """Get new Solana pairs."""
        try:
            resp = await self.client.get("/pairs/solana")
            resp.raise_for_status()
            pairs = resp.json().get("pairs", [])
            return pairs[:limit]
        except Exception as e:
            logger.error("dexscreener_new_pairs_error", error=str(e))
            return []
