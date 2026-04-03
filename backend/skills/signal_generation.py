"""Signal generation skill - produces trading signals via AI analysis."""

from .base import BaseSkill, SkillResult


class SignalGenerationSkill(BaseSkill):
    """Generate trading signals based on market data analysis."""

    name = "signal_generation"
    description = "Analyze market data and generate buy/sell/hold signals with reasoning"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Token symbol to analyze",
                },
                "timeframe": {
                    "type": "string",
                    "enum": ["1h", "4h", "1d", "1w"],
                    "description": "Analysis timeframe",
                    "default": "4h",
                },
                "indicators": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Technical indicators to consider",
                },
            },
            "required": ["symbol"],
        }

    async def execute(
        self, symbol: str = "BTC", timeframe: str = "4h", indicators: list | None = None, **kwargs
    ) -> SkillResult:
        from backend.providers import get_provider

        provider = get_provider()
        prompt = (
            f"Analyze {symbol} on the {timeframe} timeframe. "
            f"Consider indicators: {indicators or ['RSI', 'MACD', 'Volume']}. "
            "Provide a trading signal (BUY, SELL, or HOLD) with strength (0-1) and reasoning. "
            "Respond in JSON: {\"signal\": \"BUY|SELL|HOLD\", \"strength\": 0.0-1.0, \"reasoning\": \"...\"}"
        )
        try:
            response = await provider.generate(
                messages=[
                    {"role": "system", "content": "You are a quantitative analyst. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            import json
            data = json.loads(response.content)
            return SkillResult(
                success=True,
                data={
                    "symbol": symbol,
                    "signal": data.get("signal", "HOLD"),
                    "strength": float(data.get("strength", 0.5)),
                    "reasoning": data.get("reasoning", ""),
                    "timeframe": timeframe,
                },
                metadata={"provider": response.provider, "model": response.model},
            )
        except Exception as e:
            return SkillResult(success=False, error=str(e))
