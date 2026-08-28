//+------------------------------------------------------------------+
//|                                           TradeLens_Sync_MT4.mq4 |
//|                                  Copyright 2026, TradeLens Inc.  |
//|                                        https://tradelens.app     |
//+------------------------------------------------------------------+
#property copyright "TradeLens Inc."
#property link      "https://tradelens.app"
#property version   "2.00"
#property strict
#property description "Official TradeLens Live Sync Expert Advisor for MetaTrader 4."
#property description "Streams closed trade history and real-time executions to TradeLens."

//--- Input parameters
input string   InpApiKey           = "YOUR_TRADELENS_API_KEY"; // Account API Key (from TradeLens)
input string   InpServerUrl        = "http://localhost:3000";  // TradeLens Host URL
input int      InpSyncIntervalSec  = 30;                       // Sync Interval (seconds)
input int      InpHistoryDays      = 90;                       // Initial History to Sync (Days)
input bool     InpEnableLogging    = true;                     // Enable Terminal Logging

//--- Global variables
datetime g_lastSyncTime = 0;
datetime g_lastHeartbeat = 0;
int      g_lastHistoryCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if (StringLen(InpApiKey) < 10 || InpApiKey == "YOUR_TRADELENS_API_KEY")
   {
      Alert("[TradeLens] Error: Please set your TradeLens API Key in EA inputs.");
      return(INIT_FAILED);
   }

   Print("[TradeLens] Initializing MT4 Sync EA...");
   Print("[TradeLens] Target URL: ", InpServerUrl);

   EventSetTimer(InpSyncIntervalSec);

   // Perform initial sync
   SyncClosedOrders();
   SendHeartbeat();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[TradeLens] MT4 Sync EA Stopped.");
}

//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   int currentHistoryTotal = OrdersHistoryTotal();
   if (currentHistoryTotal != g_lastHistoryCount || (TimeCurrent() - g_lastSyncTime >= 300))
   {
      SyncClosedOrders();
   }

   if (TimeCurrent() - g_lastHeartbeat >= 60)
   {
      SendHeartbeat();
      g_lastHeartbeat = TimeCurrent();
   }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   int currentHistoryTotal = OrdersHistoryTotal();
   if (currentHistoryTotal > g_lastHistoryCount)
   {
      if (InpEnableLogging) Print("[TradeLens] New closed trade detected, syncing...");
      SyncClosedOrders();
   }
}

//+------------------------------------------------------------------+
//| Synchronize closed orders with TradeLens                         |
//+------------------------------------------------------------------+
void SyncClosedOrders()
{
   int total = OrdersHistoryTotal();
   g_lastHistoryCount = total;

   if (total <= 0) return;

   datetime cutoffTime = TimeCurrent() - (InpHistoryDays * 24 * 3600);
   string tradesJson = "";
   int count = 0;

   for (int i = 0; i < total; i++)
   {
      if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;

      int cmd = OrderType();
      if (cmd != OP_BUY && cmd != OP_SELL) continue; // Skip deposits / credits

      datetime closeTime = OrderCloseTime();
      if (closeTime < cutoffTime) continue;

      int ticket = OrderTicket();
      string symbol = OrderSymbol();
      double volume = OrderLots();
      datetime openTime = OrderOpenTime();
      double openPrice = OrderOpenPrice();
      double closePrice = OrderClosePrice();
      double profit = OrderProfit();
      double commission = OrderCommission();
      double swap = OrderSwap();
      string comment = OrderComment();
      int magic = OrderMagicNumber();

      string dirStr = (cmd == OP_BUY) ? "BUY" : "SELL";

      string tradeObj = StringFormat(
         "{\"ticket\":\"%d\",\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f,\"open_time\":\"%s\",\"close_time\":\"%s\",\"open_price\":%.5f,\"close_price\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"net_profit\":%.2f,\"comment\":\"%s\",\"magic_number\":%d}",
         ticket,
         symbol,
         dirStr,
         volume,
         TimeToStr(openTime, TIME_DATE|TIME_SECONDS),
         TimeToStr(closeTime, TIME_DATE|TIME_SECONDS),
         openPrice,
         closePrice,
         profit,
         commission,
         swap,
         (profit + commission + swap),
         comment,
         magic
      );

      if (count > 0) tradesJson += ",";
      tradesJson += tradeObj;
      count++;
   }

   if (count == 0) return;

   string url = InpServerUrl + "/api/sync/trades";
   string payload = StringFormat(
      "{\"api_key\":\"%s\",\"platform\":\"MT4\",\"broker\":\"%s\",\"account_number\":\"%d\",\"currency\":\"%s\",\"current_balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"leverage\":%d,\"trades\":[%s]}",
      InpApiKey,
      AccountCompany(),
      AccountNumber(),
      AccountCurrency(),
      AccountBalance(),
      AccountEquity(),
      AccountMargin(),
      AccountFreeMargin(),
      AccountLeverage(),
      tradesJson
   );

   char postData[];
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1);

   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";

   int res = WebRequest("POST", url, headers, 10000, postData, resultData, resultHeaders);

   if (res == 200)
   {
      g_lastSyncTime = TimeCurrent();
      if (InpEnableLogging) Print("[TradeLens] Successfully synced ", count, " trades to TradeLens.");
   }
   else
   {
      Print("[TradeLens] Sync failed (code ", res, "). Ensure '", InpServerUrl, "' is added in Tools -> Options -> Expert Advisors -> Allow WebRequest.");
   }
}

//+------------------------------------------------------------------+
//| Send heartbeat                                                   |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   string url = InpServerUrl + "/api/sync/heartbeat";
   string payload = StringFormat(
      "{\"api_key\":\"%s\",\"platform\":\"MT4\",\"account_number\":\"%d\",\"balance\":%.2f,\"equity\":%.2f,\"open_positions_count\":%d,\"terminal_version\":\"MT4\"}",
      InpApiKey,
      AccountNumber(),
      AccountBalance(),
      AccountEquity(),
      OrdersTotal()
   );

   char postData[];
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1);

   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";

   WebRequest("POST", url, headers, 5000, postData, resultData, resultHeaders);
}
//+------------------------------------------------------------------+
