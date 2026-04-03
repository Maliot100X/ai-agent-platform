"""Market data skill - fetches live market data from various sources."""

from .base import BaseSkill, SkillResult


class MarketDataSkill(BaseSkill):
    """Fetch current market data for crypto assets."""

    name = "market_data"
    description = "Fetch current market prices, volumes, and metadata for cryptocurrency tokens"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Token symbol (e.g., BTC, ETH, SOL)",
                },
                "source": {
                    "type": "string",
                    "enum": ["coingecko", "dexscreener", "cryptocompare"],
                    "description": "Data source to use",
                    "default": "coingecko",
                },
            },
            "required": ["symbol"],
        }

    async def execute(self, symbol: str = "BTC", source: str = "coingecko", **kwargs) -> SkillResult:
        from backend.services.market_data import MarketDataService

        svc = MarketDataService()
        try:
            adapter = svc.get_adapter(source)
            prices = await adapter.fetch_prices([symbol.lower()])
            if prices:
                return SkillResult(
                    success=True,
                    data=prices,
                    metadata={"source": source, "symbol": symbol},
                )
            return SkillResult(success=False, error=f"No data found for {symbol}")
        except Exception as e:
            return SkillResult(success=False, error=str(e))
