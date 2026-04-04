"""Trading Brain - Real-time market analysis with AI-powered signals.

Integrates Birdeye, Helius, DexScreener, PumpFun, and CoinGecko data
to provide comprehensive trading intelligence.

NO RESTRICTIONS - provides raw market analysis and trading signals.
"""

import asyncio
from datetime import datetime
from typing import Any

import httpx
import structlog

from backend.config import settings
from backend.services.solana import BirdeyeClient, HeliusClient, DexScreenerClient

logger = structlog.get_logger()


class TradingBrain:
    """AI-powered trading brain with real market analysis capabilities.

    Skills:
    - Market analysis with technical indicators
    - Signal generation (BUY/SELL/HOLD) with entry/TP/SL levels
    - Wallet portfolio analysis
    - Trending token detection
    - PumpFun new launch monitoring
    - Risk assessment
    - Whale tracking
    """

    def __init__(self):
        self.birdeye = BirdeyeClient()
        self.helius = HeliusClient()
        self.dexscreener = DexScreenerClient()
        self._cache: dict[str, Any] = {}

    async def analyze_token(self, address: str) -> dict:
        """Full analysis of a Solana token - price, security, pairs, signals."""
        birdeye_data, pairs, security = await asyncio.gather(
            self.birdeye.get_token_price(address),
            self.dexscreener.get_token_pairs(address),
            self.birdeye.get_token_security(address),
            return_exceptions=True,
        )

        price = 0
        volume_24h = 0
        liquidity = 0
        market_cap = 0

        if isinstance(birdeye_data, dict) and birdeye_data:
            price = birdeye_data.get("price", 0) or 0
            volume_24h = birdeye_data.get("v24hUSD", 0) or 0
            liquidity = birdeye_data.get("liquidity", 0) or 0
            market_cap = birdeye_data.get("mc", 0) or 0

        # Supplement from DexScreener if Birdeye data is incomplete
        if isinstance(pairs, list) and pairs and price == 0:
            top_pair = pairs[0]
            price = float(top_pair.get("priceUsd", 0) or 0)
            volume_24h = float(top_pair.get("volume", {}).get("h24", 0) or 0)
            liquidity = float(top_pair.get("liquidity", {}).get("usd", 0) or 0)
            market_cap = float(top_pair.get("fdv", 0) or 0)

        # Generate signal
        signal = self._generate_signal(price, volume_24h, liquidity, market_cap)

        # Security analysis
        sec_info = {}
        if isinstance(security, dict):
            sec_info = {
                "is_mutable": security.get("mutableMetadata", "unknown"),
                "top10_holder_pct": security.get("top10HolderPercent", 0),
                "freeze_authority": security.get("freezeAuthority"),
                "mint_authority": security.get("mintAuthority"),
            }

        return {
            "address": address,
            "price": price,
            "volume_24h": volume_24h,
            "liquidity": liquidity,
            "market_cap": market_cap,
            "signal": signal,
            "security": sec_info,
            "pairs_count": len(pairs) if isinstance(pairs, list) else 0,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _generate_signal(
        self, price: float, volume: float, liquidity: float, market_cap: float
    ) -> dict:
        """Generate a trading signal based on market metrics."""
        if price <= 0:
            return {
                "type": "UNKNOWN",
                "strength": 0,
                "reasoning": "Insufficient price data",
                "entry": 0,
                "take_profit": 0,
                "stop_loss": 0,
            }

        # Volume/Liquidity ratio analysis
        vol_liq_ratio = volume / liquidity if liquidity > 0 else 0
        momentum = 0

        # High volume relative to liquidity = strong momentum
        if vol_liq_ratio > 5:
            momentum += 3
        elif vol_liq_ratio > 2:
            momentum += 2
        elif vol_liq_ratio > 0.5:
            momentum += 1

        # Liquidity check
        if liquidity > 100000:
            momentum += 1
        if liquidity > 500000:
            momentum += 1

        # Market cap check for risk
        if market_cap > 1_000_000:
            momentum += 1

        # Determine signal
        if momentum >= 4:
            signal_type = "BUY"
            tp_mult = 1.15  # 15% TP
            sl_mult = 0.92  # 8% SL
        elif momentum >= 2:
            signal_type = "HOLD"
            tp_mult = 1.10
            sl_mult = 0.95
        else:
            signal_type = "SELL"
            tp_mult = 1.05
            sl_mult = 0.97

        return {
            "type": signal_type,
            "strength": min(momentum, 5),
            "reasoning": self._signal_reasoning(signal_type, vol_liq_ratio, liquidity, market_cap),
            "entry": price,
            "take_profit": round(price * tp_mult, 10),
            "stop_loss": round(price * sl_mult, 10),
            "vol_liq_ratio": round(vol_liq_ratio, 2),
        }

    def _signal_reasoning(
        self, signal_type: str, vlr: float, liq: float, mcap: float
    ) -> str:
        parts = []
        if signal_type == "BUY":
            parts.append("Strong buying momentum detected.")
        elif signal_type == "HOLD":
            parts.append("Neutral momentum, waiting for confirmation.")
        else:
            parts.append("Weak metrics suggest caution.")

        if vlr > 2:
            parts.append(f"Volume/liquidity ratio {vlr:.1f}x indicates high activity.")
        if liq > 100000:
            parts.append(f"Liquidity ${liq:,.0f} provides adequate depth.")
        elif liq > 0:
            parts.append(f"Low liquidity ${liq:,.0f} - high slippage risk.")
        if mcap > 0:
            parts.append(f"Market cap ${mcap:,.0f}.")

        return " ".join(parts)

    async def analyze_wallet(self, wallet_address: str) -> dict:
        """Analyze a Solana wallet - holdings, balance, recent activity."""
        balance, assets, txns = await asyncio.gather(
            self.helius.get_wallet_balance(wallet_address),
            self.helius.get_wallet_assets(wallet_address),
            self.helius.get_recent_transactions(wallet_address, limit=10),
            return_exceptions=True,
        )

        sol_balance = balance.get("sol", 0) if isinstance(balance, dict) else 0
        token_count = len(assets) if isinstance(assets, list) else 0
        txn_count = len(txns) if isinstance(txns, list) else 0

        # Format top holdings
        holdings = []
        if isinstance(assets, list):
            for asset in assets[:20]:
                content = asset.get("content", {})
                meta = content.get("metadata", {})
                holdings.append({
                    "name": meta.get("name", "Unknown"),
                    "symbol": meta.get("symbol", "???"),
                    "id": asset.get("id", ""),
                })

        return {
            "wallet": wallet_address,
            "sol_balance": sol_balance,
            "token_count": token_count,
            "recent_transactions": txn_count,
            "top_holdings": holdings,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_trending_tokens(self) -> list[dict]:
        """Get trending tokens from multiple sources."""
        birdeye_trending, dex_pairs = await asyncio.gather(
            self.birdeye.get_trending_tokens(limit=20),
            self.dexscreener.get_solana_new_pairs(limit=20),
            return_exceptions=True,
        )

        results = []

        if isinstance(birdeye_trending, list):
            for t in birdeye_trending[:10]:
                results.append({
                    "source": "birdeye",
                    "name": t.get("name", ""),
                    "symbol": t.get("symbol", ""),
                    "address": t.get("address", ""),
                    "price": t.get("price", 0),
                    "volume_24h": t.get("v24hUSD", 0),
                })

        if isinstance(dex_pairs, list):
            for p in dex_pairs[:10]:
                base = p.get("baseToken", {})
                results.append({
                    "source": "dexscreener",
                    "name": base.get("name", ""),
                    "symbol": base.get("symbol", ""),
                    "address": base.get("address", ""),
                    "price": float(p.get("priceUsd", 0) or 0),
                    "volume_24h": float(p.get("volume", {}).get("h24", 0) or 0),
                })

        return results

    async def get_market_summary(self) -> dict:
        """Get overall crypto market summary."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://api.coingecko.com/api/v3/global"
                )
                resp.raise_for_status()
                data = resp.json().get("data", {})
                return {
                    "total_market_cap": data.get("total_market_cap", {}).get("usd", 0),
                    "total_volume_24h": data.get("total_volume", {}).get("usd", 0),
                    "btc_dominance": data.get("market_cap_percentage", {}).get("btc", 0),
                    "eth_dominance": data.get("market_cap_percentage", {}).get("eth", 0),
                    "active_coins": data.get("active_cryptocurrencies", 0),
                    "markets": data.get("markets", 0),
                    "market_cap_change_24h": data.get("market_cap_change_percentage_24h_usd", 0),
                    "timestamp": datetime.utcnow().isoformat(),
                }
        except Exception as e:
            logger.error("market_summary_error", error=str(e))
            return {"error": str(e)}

    async def get_pumpfun_launches(self, limit: int = 10) -> list[dict]:
        """Get latest PumpFun token launches."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://frontend-api-v3.pump.fun/coins",
                    params={
                        "offset": 0,
                        "limit": limit,
                        "sort": "created_timestamp",
                        "order": "DESC",
                        "includeNsfw": "false",
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()
                return [
                    {
                        "mint": t.get("mint", ""),
                        "name": t.get("name", ""),
                        "symbol": t.get("symbol", ""),
                        "market_cap": t.get("usd_market_cap", 0),
                        "complete": t.get("complete", False),
                        "reply_count": t.get("reply_count", 0),
                        "created": t.get("created_timestamp", 0),
                    }
                    for t in tokens[:limit]
                ]
        except Exception as e:
            logger.error("pumpfun_launches_error", error=str(e))
            return []


# Singleton instance
trading_brain = TradingBrain()
