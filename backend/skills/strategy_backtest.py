"""Strategy backtest skill - runs historical simulation of strategies."""

import random
from .base import BaseSkill, SkillResult


class StrategyBacktestSkill(BaseSkill):
    """Run a backtest simulation on a given strategy."""

    name = "strategy_backtest"
    description = "Simulate a trading strategy against historical data and return performance metrics"

    @property
    def inputs(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "strategy": {
                    "type": "string",
                    "enum": ["momentum", "mean_reversion", "breakout"],
                    "description": "Strategy type to backtest",
                },
                "symbol": {
                    "type": "string",
                    "description": "Token symbol to backtest on",
                },
                "days": {
                    "type": "integer",
                    "description": "Number of historical days",
                    "default": 30,
                },
            },
            "required": ["strategy", "symbol"],
        }

    async def execute(
        self, strategy: str = "momentum", symbol: str = "BTC", days: int = 30, **kwargs
    ) -> SkillResult:
        # Simulated backtest results (in production, use real historical data)
        total_trades = random.randint(10, 50)
        win_rate = round(random.uniform(0.35, 0.72), 3)
        winners = int(total_trades * win_rate)
        losers = total_trades - winners
        avg_win = round(random.uniform(1.5, 5.0), 2)
        avg_loss = round(random.uniform(0.8, 3.0), 2)
        total_pnl = round(winners * avg_win - losers * avg_loss, 2)
        max_drawdown = round(random.uniform(3.0, 15.0), 2)
        sharpe = round(random.uniform(0.5, 2.5), 2)

        return SkillResult(
            success=True,
            data={
                "strategy": strategy,
                "symbol": symbol,
                "period_days": days,
                "total_trades": total_trades,
                "win_rate": win_rate,
                "winners": winners,
                "losers": losers,
                "avg_win_pct": avg_win,
                "avg_loss_pct": avg_loss,
                "total_pnl_pct": total_pnl,
                "max_drawdown_pct": max_drawdown,
                "sharpe_ratio": sharpe,
            },
        )
