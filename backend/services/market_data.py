"""Market data service with pluggable adapters."""

from abc import ABC, abstractmethod
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()


class MarketDataAdapter(ABC):
    """Base adapter for market data sources."""

    @abstractmethod
    async def fetch_markets(self) -> list[dict]:
        ...

    @abstractmethod
    async def fetch_pairs(self, base: str) -> list[dict]:
        ...

    @abstractmethod
    async def fetch_prices(self, symbols: list[str]) -> dict:
        ...

    @abstractmethod
    async def stream_trades(self, symbol: str):
        ...


class CoinGeckoAdapter(MarketDataAdapter):
    """CoinGecko API adapter."""

    BASE_URL = "https://api.coingecko.com/api/v3"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_markets(self) -> list[dict]:
        resp = await self.client.get(
            f"{self.BASE_URL}/coins/markets",
            params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 50,
                "page": 1,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def fetch_pairs(self, base: str) -> list[dict]:
        resp = await self.client.get(f"{self.BASE_URL}/coins/{base}/tickers")
        resp.raise_for_status()
        return resp.json().get("tickers", [])

    async def fetch_prices(self, symbols: list[str]) -> dict:
        ids = ",".join(symbols)
        resp = await self.client.get(
            f"{self.BASE_URL}/simple/price",
            params={"ids": ids, "vs_currencies": "usd", "include_24hr_change": "true"},
        )
        resp.raise_for_status()
        return resp.json()

    async def stream_trades(self, symbol: str):
        # CoinGecko doesn't support WebSocket streaming
        # Poll-based fallback
        while True:
            try:
                data = await self.fetch_prices([symbol])
                yield data
            except Exception as e:
                logger.error("coingecko_stream_error", error=str(e))
            import asyncio
            await asyncio.sleep(30)


class DexScreenerAdapter(MarketDataAdapter):
    """DexScreener API adapter."""

    BASE_URL = "https://api.dexscreener.com/latest/dex"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_markets(self) -> list[dict]:
        resp = await self.client.get(f"{self.BASE_URL}/tokens/SOL")
        resp.raise_for_status()
        return resp.json().get("pairs", [])[:50]

    async def fetch_pairs(self, base: str) -> list[dict]:
        resp = await self.client.get(f"{self.BASE_URL}/search?q={base}")
        resp.raise_for_status()
        return resp.json().get("pairs", [])

    async def fetch_prices(self, symbols: list[str]) -> dict:
        results = {}
        for symbol in symbols:
            try:
                resp = await self.client.get(f"{self.BASE_URL}/search?q={symbol}")
                resp.raise_for_status()
                pairs = resp.json().get("pairs", [])
                if pairs:
                    results[symbol] = {
                        "usd": float(pairs[0].get("priceUsd", 0)),
                        "usd_24h_change": float(pairs[0].get("priceChange", {}).get("h24", 0)),
                    }
            except Exception:
                continue
        return results

    async def stream_trades(self, symbol: str):
        while True:
            try:
                data = await self.fetch_prices([symbol])
                yield data
            except Exception as e:
                logger.error("dexscreener_stream_error", error=str(e))
            import asyncio
            await asyncio.sleep(15)


class CryptoCompareAdapter(MarketDataAdapter):
    """CryptoCompare API adapter."""

    BASE_URL = "https://min-api.cryptocompare.com/data"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_markets(self) -> list[dict]:
        resp = await self.client.get(f"{self.BASE_URL}/top/mktcapfull?limit=50&tsym=USD")
        resp.raise_for_status()
        return resp.json().get("Data", [])

    async def fetch_pairs(self, base: str) -> list[dict]:
        resp = await self.client.get(
            f"{self.BASE_URL}/top/pairs?fsym={base.upper()}&limit=20"
        )
        resp.raise_for_status()
        return resp.json().get("Data", [])

    async def fetch_prices(self, symbols: list[str]) -> dict:
        fsyms = ",".join(s.upper() for s in symbols)
        resp = await self.client.get(
            f"{self.BASE_URL}/pricemultifull?fsyms={fsyms}&tsyms=USD"
        )
        resp.raise_for_status()
        raw = resp.json().get("RAW", {})
        results = {}
        for sym, data in raw.items():
            usd_data = data.get("USD", {})
            results[sym.lower()] = {
                "usd": usd_data.get("PRICE", 0),
                "usd_24h_change": usd_data.get("CHANGEPCT24HOUR", 0),
            }
        return results

    async def stream_trades(self, symbol: str):
        while True:
            try:
                data = await self.fetch_prices([symbol])
                yield data
            except Exception as e:
                logger.error("cryptocompare_stream_error", error=str(e))
            import asyncio
            await asyncio.sleep(20)


class MarketDataService:
    """Central service for accessing market data from multiple sources."""

    _adapters: dict[str, MarketDataAdapter] = {}

    def __init__(self):
        if not self._adapters:
            self._adapters = {
                "coingecko": CoinGeckoAdapter(),
                "dexscreener": DexScreenerAdapter(),
                "cryptocompare": CryptoCompareAdapter(),
            }

    def get_adapter(self, source: str = "coingecko") -> MarketDataAdapter:
        adapter = self._adapters.get(source)
        if not adapter:
            raise ValueError(f"Unknown data source: {source}")
        return adapter

    def list_sources(self) -> list[str]:
        return list(self._adapters.keys())
