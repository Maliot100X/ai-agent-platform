"""News sentiment analysis skill."""

from .base import BaseSkill, SkillResult


class NewsSentimentSkill(BaseSkill):
    """Analyze crypto news sentiment using AI."""

    name = "news_sentiment"
    description = "Analyze recent news sentiment for a cryptocurrency and provide bullish/bearish assessment"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Token symbol to analyze sentiment for",
                },
                "count": {
                    "type": "integer",
                    "description": "Number of recent items to analyze",
                    "default": 5,
                },
            },
            "required": ["symbol"],
        }

    async def execute(self, symbol: str = "BTC", count: int = 5, **kwargs) -> SkillResult:
        from backend.providers import get_provider

        provider = get_provider()
        try:
            response = await provider.generate(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a crypto sentiment analyst. Respond with valid JSON only.",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Provide a current sentiment analysis for {symbol}. "
                            "Include overall sentiment (bullish/bearish/neutral), "
                            "confidence (0-1), key factors, and a brief summary. "
                            'JSON format: {"sentiment": "...", "confidence": 0.0, '
                            '"factors": [...], "summary": "..."}'
                        ),
                    },
                ],
                temperature=0.4,
            )
            import json
            data = json.loads(response.content)
            return SkillResult(
                success=True,
                data={"symbol": symbol, **data},
                metadata={"provider": response.provider},
            )
        except Exception as e:
            return SkillResult(success=False, error=str(e))
