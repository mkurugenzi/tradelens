"""
TradeLens - 1-Click Desktop MT5 Synchronizer
Connects directly to your running MetaTrader 5 terminal without any EA or MQL code.
Streams closed trades, account balance, and equity directly to your TradeLens dashboard.
"""

import sys
import os
import time
import argparse
from datetime import datetime, timedelta, timezone

# ANSI Colors for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'

def print_banner():
    banner = f"""
{Colors.CYAN}{Colors.BOLD}=============================================================
   TradeLens ⚡ 1-Click MetaTrader 5 Desktop Sync
============================================================={Colors.RESET}
"""
    print(banner)

def check_dependencies():
    missing = []
    try:
        import MetaTrader5
    except ImportError:
        missing.append("MetaTrader5")
    try:
        import requests
    except ImportError:
        missing.append("requests")

    if missing:
        print(f"{Colors.YELLOW}[!] Missing required packages: {', '.join(missing)}{Colors.RESET}")
        print(f"[*] Installing now via pip...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print(f"{Colors.GREEN}[✓] Dependencies installed successfully!{Colors.RESET}\n")

check_dependencies()
import MetaTrader5 as mt5
import requests


def extract_closed_trades(from_date, to_date):
    """
    Retrieves and pairs closed deals into complete trade records.
    """
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None or len(deals) == 0:
        return []

    # Group deals by position_id
    positions = {}
    for d in deals:
        # Ignore balance/credit/deposit deals (entry 2 or symbol empty)
        if not d.symbol:
            continue
        
        pos_id = d.position_id if d.position_id != 0 else d.order
        if pos_id not in positions:
            positions[pos_id] = []
        positions[pos_id].append(d)

    completed_trades = []

    for pos_id, deal_list in positions.items():
        # Sort by time
        deal_list.sort(key=lambda x: x.time)
        
        # Look for entry (ENTRY_IN = 0) and exit (ENTRY_OUT = 1 or ENTRY_INOUT = 2)
        in_deals = [d for d in deal_list if getattr(d, 'entry', 0) == 0]
        out_deals = [d for d in deal_list if getattr(d, 'entry', 0) in (1, 2)]

        if not out_deals:
            # Position still open, ignore
            continue

        first_in = in_deals[0] if in_deals else deal_list[0]
        last_out = out_deals[-1]

        # Calculate totals
        total_profit = sum(d.profit for d in deal_list)
        total_commission = sum(d.commission for d in deal_list)
        total_swap = sum(d.swap for d in deal_list)
        net_profit = total_profit + total_commission + total_swap

        # Trade type: 0 = BUY, 1 = SELL
        raw_type = getattr(first_in, 'type', 0)
        trade_type = "BUY" if raw_type == 0 else "SELL"

        open_time = datetime.fromtimestamp(first_in.time, tz=timezone.utc).isoformat()
        close_time = datetime.fromtimestamp(last_out.time, tz=timezone.utc).isoformat()

        trade_record = {
            "ticket": str(pos_id if pos_id != 0 else last_out.ticket),
            "symbol": first_in.symbol,
            "trade_type": trade_type,
            "volume": float(first_in.volume),
            "open_time": open_time,
            "close_time": close_time,
            "open_price": float(first_in.price),
            "close_price": float(last_out.price),
            "profit": round(float(total_profit), 2),
            "commission": round(float(total_commission), 2),
            "swap": round(float(total_swap), 2),
            "net_profit": round(float(net_profit), 2),
            "comment": last_out.comment or first_in.comment or "",
            "magic_number": getattr(first_in, 'magic', 0),
        }
        completed_trades.append(trade_record)

    return completed_trades


def sync_once(api_key: str, server_url: str, history_days: int = 90):
    """
    Connects to MT5 and posts the latest account data + trades.
    """
    # 1. Connect to MT5
    if not mt5.initialize():
        last_err = mt5.last_error()
        print(f"{Colors.RED}[✗] Failed to connect to MetaTrader 5: {last_err}{Colors.RESET}")
        print(f"{Colors.YELLOW}[i] Please ensure your MetaTrader 5 terminal is open and logged in.{Colors.RESET}")
        return False

    # 2. Get Account Info
    account_info = mt5.account_info()
    if account_info is None:
        print(f"{Colors.RED}[✗] Could not read MT5 account info.{Colors.RESET}")
        mt5.shutdown()
        return False

    now = datetime.now()
    from_date = now - timedelta(days=history_days)
    trades = extract_closed_trades(from_date, now)

    payload = {
        "api_key": api_key,
        "platform": "MT5",
        "broker": account_info.company or account_info.server or "MetaTrader 5",
        "account_number": str(account_info.login),
        "currency": account_info.currency or "USD",
        "current_balance": float(account_info.balance),
        "equity": float(account_info.equity),
        "margin": float(getattr(account_info, 'margin', 0)),
        "free_margin": float(getattr(account_info, 'margin_free', 0)),
        "leverage": int(account_info.leverage or 100),
        "trades": trades
    }

    target_url = server_url.rstrip("/") + "/api/sync/trades"

    try:
        res = requests.post(target_url, json=payload, timeout=15)
        mt5.shutdown()

        if res.status_code == 200:
            data = res.json()
            synced = data.get("synced_count", 0)
            duplicates = data.get("duplicate_count", 0)
            print(
                f"{Colors.GREEN}[✓] [{datetime.now().strftime('%H:%M:%S')}] "
                f"Sync Successful! Account #{account_info.login} ({account_info.company}) | "
                f"Balance: ${account_info.balance:,.2f} | Equity: ${account_info.equity:,.2f} | "
                f"New Trades: {synced} | Existing: {duplicates}{Colors.RESET}"
            )
            return True
        else:
            try:
                err_data = res.json()
                msg = err_data.get("message", res.text)
            except Exception:
                msg = res.text
            print(f"{Colors.RED}[✗] Server returned {res.status_code}: {msg}{Colors.RESET}")
            return False
    except requests.exceptions.RequestException as e:
        mt5.shutdown()
        print(f"{Colors.RED}[✗] Network Error connecting to {target_url}: {e}{Colors.RESET}")
        return False


def main():
    parser = argparse.ArgumentParser(description="TradeLens 1-Click MT5 Desktop Synchronizer")
    parser.add_argument("--api-key", required=False, help="TradeLens Account API Key")
    parser.add_argument("--url", default="http://localhost:3000", help="TradeLens Web App URL")
    parser.add_argument("--days", type=int, default=90, help="Initial history days to sync (default: 90)")
    parser.add_argument("--interval", type=int, default=15, help="Continuous sync interval in seconds (default: 15)")
    parser.add_argument("--once", action="store_true", help="Sync once and exit")

    args = parser.parse_args()

    print_banner()

    api_key = args.api_key or os.environ.get("TRADELENS_API_KEY")

    if not api_key:
        print(f"{Colors.YELLOW}[?] Please enter your TradeLens Account API Key:{Colors.RESET}")
        api_key = input("API Key > ").strip()

    if not api_key:
        print(f"{Colors.RED}[✗] Error: API Key is required.{Colors.RESET}")
        sys.exit(1)

    print(f"[*] Target Server: {Colors.CYAN}{args.url}{Colors.RESET}")
    print(f"[*] Account Key:   {Colors.CYAN}{api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else ''}{Colors.RESET}")
    print(f"[*] Sync Mode:     {Colors.CYAN}{'One-Time' if args.once else f'Continuous (Every {args.interval}s)'}{Colors.RESET}\n")

    if args.once:
        sync_once(api_key, args.url, args.days)
        return

    print(f"{Colors.GREEN}[*] Starting real-time sync loop. Press Ctrl+C to stop.{Colors.RESET}\n")
    
    while True:
        try:
            sync_once(api_key, args.url, args.days)
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}[*] Sync stopped by user.{Colors.RESET}")
            break
        except Exception as e:
            print(f"{Colors.RED}[!] Unexpected error: {e}{Colors.RESET}")
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
