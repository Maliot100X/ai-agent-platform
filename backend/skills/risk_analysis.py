"""Risk analysis skill - evaluates portfolio and position risk."""

from .base import BaseSkill, SkillResult


class RiskAnalysisSkill(BaseSkill):
    """Analyze risk metrics for positions and portfolio."""

    name = "risk_analysis"
    description = "Evaluate risk levels for positions including max drawdown, exposure, and risk/reward ratio"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "positions": {
                    "type": "array",
                    "description": "List of open position dicts with symbol, side, entry_price, quantity",
                    "items": {"type": "object"},
                },
                "portfolio_value": {
                    "type": "number",
                    "description": "Total simulated portfolio value in USD",
                },
            },
            "required": ["positions"],
        }

    async def execute(
        self, positions: list | None = None, portfolio_value: float = 10000.0, **kwargs
    ) -> SkillResult:
        positions = positions or []
        if not positions:
            return SkillResult(
                success=True,
                data={"risk_level": "none", "exposure": 0, "message": "No open positions"},
            )

        total_exposure = sum(
            abs(p.get("entry_price", 0) * p.get("quantity", 0)) for p in positions
        )
        exposure_pct = (total_exposure / portfolio_value * 100) if portfolio_value > 0 else 0

        if exposure_pct > 80:
            risk_level = "critical"
        elif exposure_pct > 50:
            risk_level = "high"
        elif exposure_pct > 25:
            risk_level = "medium"
        else:
            risk_level = "low"

        return SkillResult(
            success=True,
            data={
                "risk_level": risk_level,
                "total_exposure_usd": round(total_exposure, 2),
                "exposure_percent": round(exposure_pct, 2),
                "position_count": len(positions),
                "portfolio_value": portfolio_value,
                "recommendation": (
                    "Reduce exposure" if risk_level in ("critical", "high") else "Within limits"
                ),
            },
        )
