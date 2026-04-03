"""Built-in trading strategies for the paper trading engine."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass
class StrategySignal:
    """Signal produced by a strategy."""
    symbol: str
    action: str  # buy, sell, hold
    strength: float  # 0.0 to 1.0
    price: float
    reasoning: str
    stop_loss: float | None = None
    take_profit: float | None = None


class BaseStrategy(ABC):
    """Base class for all trading strategies."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    async def analyze(self, market_data: dict) -> StrategySignal | None:
        """Analyze market data and optionally produce a signal."""
        ...


class MomentumStrategy(BaseStrategy):
    """Momentum-based strategy.

    Looks for sustained price movement in one direction.
    Buys on upward momentum, sells on downward momentum.
    """

    name = "momentum"
    description = "Trades in the direction of sustained price momentum"

    def __init__(self, threshold: float = 3.0, lookback: int = 24):
        self.threshold = threshold  # % change threshold
        self.lookback = lookback  # hours to look back
        self.price_history: dict[str, list[float]] = {}

    async def analyze(self, market_data: dict) -> StrategySignal | None:
        for symbol, data in market_data.items():
            price = data.get("usd", 0)
            change_24h = data.get("usd_24h_change", 0)

            if not price or not change_24h:
                continue

            # Track price history
            if symbol not in self.price_history:
                self.price_history[symbol] = []
            self.price_history[symbol].append(price)
            if len(self.price_history[symbol]) > 100:
                self.price_history[symbol] = self.price_history[symbol][-100:]

            if change_24h > self.threshold:
                return StrategySignal(
                    symbol=symbol,
                    action="buy",
                    strength=min(abs(change_24h) / 10, 1.0),
                    price=price,
                    reasoning=f"Strong upward momentum: {change_24h:.1f}% in 24h",
                    stop_loss=price * 0.95,
                    take_profit=price * 1.10,
                )
            elif change_24h < -self.threshold:
                return StrategySignal(
                    symbol=symbol,
                    action="sell",
                    strength=min(abs(change_24h) / 10, 1.0),
                    price=price,
                    reasoning=f"Strong downward momentum: {change_24h:.1f}% in 24h",
                    stop_loss=price * 1.05,
                    take_profit=price * 0.90,
                )
        return None


class MeanReversionStrategy(BaseStrategy):
    """Mean reversion strategy.

    Looks for overextended moves and trades the reversal.
    """

    name = "mean_reversion"
    description = "Trades reversals when price is overextended from its mean"

    def __init__(self, overbought: float = 8.0, oversold: float = -8.0):
        self.overbought = overbought
        self.oversold = oversold

    async def analyze(self, market_data: dict) -> StrategySignal | None:
        for symbol, data in market_data.items():
            price = data.get("usd", 0)
            change_24h = data.get("usd_24h_change", 0)

            if not price or not change_24h:
                continue

            if change_24h > self.overbought:
                return StrategySignal(
                    symbol=symbol,
                    action="sell",
                    strength=min(abs(change_24h) / 15, 1.0),
                    price=price,
                    reasoning=f"Overbought: {change_24h:.1f}% move, expecting mean reversion",
                    stop_loss=price * 1.03,
                    take_profit=price * 0.95,
                )
            elif change_24h < self.oversold:
                return StrategySignal(
                    symbol=symbol,
                    action="buy",
                    strength=min(abs(change_24h) / 15, 1.0),
                    price=price,
                    reasoning=f"Oversold: {change_24h:.1f}% drop, expecting mean reversion",
                    stop_loss=price * 0.97,
                    take_profit=price * 1.05,
                )
        return None


class BreakoutStrategy(BaseStrategy):
    """Breakout detection strategy.

    Monitors for price breaking through key levels.
    """

    name = "breakout"
    description = "Detects and trades price breakouts from consolidation ranges"

    def __init__(self, breakout_threshold: float = 5.0):
        self.breakout_threshold = breakout_threshold
        self.price_ranges: dict[str, dict] = {}

    async def analyze(self, market_data: dict) -> StrategySignal | None:
        for symbol, data in market_data.items():
            price = data.get("usd", 0)
            change_24h = data.get("usd_24h_change", 0)

            if not price:
                continue

            # Track ranges
            if symbol not in self.price_ranges:
                self.price_ranges[symbol] = {"high": price, "low": price, "samples": 0}

            r = self.price_ranges[symbol]
            r["samples"] += 1

            # Need some history before detecting breakouts
            if r["samples"] < 5:
                r["high"] = max(r["high"], price)
                r["low"] = min(r["low"], price)
                continue

            range_size = ((r["high"] - r["low"]) / r["low"] * 100) if r["low"] > 0 else 0

            # Breakout above range
            if price > r["high"] and abs(change_24h) > self.breakout_threshold:
                signal = StrategySignal(
                    symbol=symbol,
                    action="buy",
                    strength=min(abs(change_24h) / 10, 1.0),
                    price=price,
                    reasoning=f"Breakout above {r['high']:.2f} range (range was {range_size:.1f}%)",
                    stop_loss=r["high"] * 0.98,
                    take_profit=price * 1.08,
                )
                # Reset range
                self.price_ranges[symbol] = {"high": price, "low": price, "samples": 0}
                return signal

            # Breakdown below range
            if price < r["low"] and abs(change_24h) > self.breakout_threshold:
                signal = StrategySignal(
                    symbol=symbol,
                    action="sell",
                    strength=min(abs(change_24h) / 10, 1.0),
                    price=price,
                    reasoning=f"Breakdown below {r['low']:.2f} range (range was {range_size:.1f}%)",
                    stop_loss=r["low"] * 1.02,
                    take_profit=price * 0.92,
                )
                self.price_ranges[symbol] = {"high": price, "low": price, "samples": 0}
                return signal

            # Update range
            r["high"] = max(r["high"], price)
            r["low"] = min(r["low"], price)

        return None
