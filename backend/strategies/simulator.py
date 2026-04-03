"""Paper trading engine - simulates positions without real execution."""

import uuid
from datetime import datetime
from typing import Any

import structlog

logger = structlog.get_logger()


class PaperPosition:
    """A simulated trading position."""

    def __init__(
        self,
        symbol: str,
        side: str,
        entry_price: float,
        quantity: float,
        stop_loss: float | None = None,
        take_profit: float | None = None,
        strategy: str = "",
    ):
        self.id = str(uuid.uuid4())
        self.symbol = symbol
        self.side = side  # long or short
        self.entry_price = entry_price
        self.current_price = entry_price
        self.quantity = quantity
        self.stop_loss = stop_loss
        self.take_profit = take_profit
        self.strategy = strategy
        self.status = "open"
        self.pnl = 0.0
        self.pnl_percent = 0.0
        self.opened_at = datetime.utcnow()
        self.closed_at: datetime | None = None

    def update_price(self, price: float) -> None:
        self.current_price = price
        if self.side == "long":
            self.pnl = (price - self.entry_price) * self.quantity
            self.pnl_percent = ((price - self.entry_price) / self.entry_price) * 100
        else:
            self.pnl = (self.entry_price - price) * self.quantity
            self.pnl_percent = ((self.entry_price - price) / self.entry_price) * 100

    def check_exits(self) -> str | None:
        """Check stop loss and take profit. Returns exit reason or None."""
        if self.stop_loss and self.side == "long" and self.current_price <= self.stop_loss:
            return "stop_loss"
        if self.stop_loss and self.side == "short" and self.current_price >= self.stop_loss:
            return "stop_loss"
        if self.take_profit and self.side == "long" and self.current_price >= self.take_profit:
            return "take_profit"
        if self.take_profit and self.side == "short" and self.current_price <= self.take_profit:
            return "take_profit"
        return None

    def close(self, reason: str = "manual") -> None:
        self.status = f"closed_{reason}"
        self.closed_at = datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "side": self.side,
            "entry_price": self.entry_price,
            "current_price": self.current_price,
            "quantity": self.quantity,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "strategy": self.strategy,
            "status": self.status,
            "pnl": round(self.pnl, 4),
            "pnl_percent": round(self.pnl_percent, 4),
            "opened_at": self.opened_at.isoformat(),
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
        }


class PaperTradingEngine:
    """Paper trading simulation engine.

    Tracks simulated positions, PnL, and enforces risk limits.
    NO real trades are ever executed.
    """

    def __init__(self, initial_balance: float = 10000.0, max_positions: int = 10):
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.max_positions = max_positions
        self.open_positions: dict[str, PaperPosition] = {}
        self.closed_positions: list[PaperPosition] = []
        self.trade_history: list[dict] = []

    def open_position(
        self,
        symbol: str,
        side: str,
        price: float,
        quantity: float,
        stop_loss: float | None = None,
        take_profit: float | None = None,
        strategy: str = "",
    ) -> PaperPosition | None:
        if len(self.open_positions) >= self.max_positions:
            logger.warning("max_positions_reached", max=self.max_positions)
            return None

        cost = price * quantity
        if cost > self.balance:
            logger.warning("insufficient_balance", cost=cost, balance=self.balance)
            return None

        pos = PaperPosition(
            symbol=symbol,
            side=side,
            entry_price=price,
            quantity=quantity,
            stop_loss=stop_loss,
            take_profit=take_profit,
            strategy=strategy,
        )
        self.open_positions[pos.id] = pos
        self.balance -= cost

        self.trade_history.append({
            "action": "open",
            "position_id": pos.id,
            "symbol": symbol,
            "side": side,
            "price": price,
            "quantity": quantity,
            "timestamp": datetime.utcnow().isoformat(),
        })

        logger.info("position_opened", id=pos.id, symbol=symbol, side=side, price=price)
        return pos

    def close_position(self, position_id: str, reason: str = "manual") -> PaperPosition | None:
        pos = self.open_positions.get(position_id)
        if not pos:
            return None

        pos.close(reason)
        self.balance += pos.current_price * pos.quantity
        del self.open_positions[position_id]
        self.closed_positions.append(pos)

        self.trade_history.append({
            "action": "close",
            "position_id": pos.id,
            "symbol": pos.symbol,
            "reason": reason,
            "pnl": pos.pnl,
            "pnl_percent": pos.pnl_percent,
            "timestamp": datetime.utcnow().isoformat(),
        })

        logger.info("position_closed", id=pos.id, reason=reason, pnl=pos.pnl)
        return pos

    def update_prices(self, prices: dict[str, float]) -> list[dict]:
        """Update all open positions with latest prices. Returns any triggered exits."""
        exits = []
        for pos in list(self.open_positions.values()):
            if pos.symbol in prices:
                pos.update_price(prices[pos.symbol])
                exit_reason = pos.check_exits()
                if exit_reason:
                    self.close_position(pos.id, exit_reason)
                    exits.append({"position_id": pos.id, "reason": exit_reason, "pnl": pos.pnl})
        return exits

    def get_portfolio(self) -> dict:
        open_pnl = sum(p.pnl for p in self.open_positions.values())
        closed_pnl = sum(p.pnl for p in self.closed_positions)
        total_pnl = open_pnl + closed_pnl
        wins = sum(1 for p in self.closed_positions if p.pnl > 0)
        total_closed = len(self.closed_positions)

        return {
            "balance": round(self.balance, 2),
            "initial_balance": self.initial_balance,
            "total_pnl": round(total_pnl, 2),
            "total_pnl_percent": round((total_pnl / self.initial_balance) * 100, 2) if self.initial_balance else 0,
            "open_pnl": round(open_pnl, 2),
            "closed_pnl": round(closed_pnl, 2),
            "open_positions": len(self.open_positions),
            "closed_positions": total_closed,
            "win_rate": round(wins / total_closed * 100, 1) if total_closed > 0 else 0,
            "positions": [p.to_dict() for p in self.open_positions.values()],
        }
