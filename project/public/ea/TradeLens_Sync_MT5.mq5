//+------------------------------------------------------------------+
//|                                           TradeLens_Sync_MT5.mq5 |
//|                                  Copyright 2026, TradeLens Inc.  |
//|                                        https://tradelens.app     |
//+------------------------------------------------------------------+
#property copyright "TradeLens Inc."
#property link      "https://tradelens.app"
#property version   "2.00"
#property description "Official TradeLens Live Sync Expert Advisor for MetaTrader 5."
#property description "Automatically streams closed trades and account health to your TradeLens dashboard."

#include <Trade\Trade.mqh>

//--- Input parameters
input group "=== TradeLens Connection ==="
input string   InpApiKey           = "YOUR_TRADELENS_API_KEY"; // Account API Key (from TradeLens)
input string   InpServerUrl        = "http://localhost:3000";  // TradeLens Host URL (or your domain)
input group "=== Synchronization Settings ==="
input int      InpSyncIntervalSec  = 30;                       // Sync Interval (seconds)
input int      InpHistoryDays      = 90;                       // Initial History to Sync (Days)
input bool     InpEnableLogging    = true;                     // Enable Terminal Logging

//--- Global variables
datetime g_lastSyncTime = 0;
datetime g_lastHeartbeat = 0;
ulong    g_lastProcessedDealTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if (StringLen(InpApiKey) < 10 || InpApiKey == "YOUR_TRADELENS_API_KEY")
   {
      Alert("[TradeLens] Error: Please enter your TradeLens Account API Key in EA properties.");
      return(INIT_FAILED);
   }

   Print("[TradeLens] Initializing MetaTrader 5 Sync EA...");
   Print("[TradeLens] Server Target: ", InpServerUrl);

   // Set timer for periodic synchronization
   EventSetTimer(InpSyncIntervalSec);

   // Perform initial historical sync
   datetime fromDate = TimeCurrent() - (InpHistoryDays * 24 * 3600);
   SyncClosedDeals(fromDate);

   SendHeartbeat();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("[TradeLens] MetaTrader 5 Sync EA Stopped.");
}

//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Check for new closed deals since last check
   datetime fromDate = (g_lastSyncTime > 0) ? g_lastSyncTime : (TimeCurrent() - (InpHistoryDays * 24 * 3600));
   SyncClosedDeals(fromDate);

   // Heartbeat every 60 seconds
   if (TimeCurrent() - g_lastHeartbeat >= 60)
   {
      SendHeartbeat();
      g_lastHeartbeat = TimeCurrent();
   }
}

//+------------------------------------------------------------------+
//| Expert trade transaction function                                |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // When a deal transaction is completed, trigger immediate sync
   if (trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      if (InpEnableLogging) Print("[TradeLens] Deal transaction detected, syncing...");
      datetime fromDate = TimeCurrent() - 3600; // Check last hour
      SyncClosedDeals(fromDate);
   }
}

//+------------------------------------------------------------------+
//| Synchronize closed deals with TradeLens API                     |
//+------------------------------------------------------------------+
void SyncClosedDeals(datetime fromDate)
{
   if (!HistorySelect(fromDate, TimeCurrent() + 60))
   {
      Print("[TradeLens] Warning: Failed to query history deals.");
      return;
   }

   int totalDeals = HistoryDealsTotal();
   if (totalDeals <= 0) return;

   string tradesJson = "";
   int count = 0;

   for (int i = 0; i < totalDeals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if (dealTicket <= 0) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      // We only sync OUT deals (closed positions)
      if (entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if (dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      long orderTicket = HistoryDealGetInteger(dealTicket, DEAL_ORDER);
      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
      long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);

      // Estimate open time and open price from order
      datetime openTime = closeTime - 60; // fallback
      double openPrice = closePrice;

      if (HistoryOrderSelect(orderTicket))
      {
         openTime = (datetime)HistoryOrderGetInteger(orderTicket, ORDER_TIME_SETUP);
         if (openTime <= 0) openTime = (datetime)HistoryOrderGetInteger(orderTicket, ORDER_TIME_DONE);
         openPrice = HistoryOrderGetDouble(orderTicket, ORDER_PRICE_OPEN);
      }

      string directionStr = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";

      string tradeObj = StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f,\"open_time\":\"%s\",\"close_time\":\"%s\",\"open_price\":%.5f,\"close_price\":%.5f,\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"net_profit\":%.2f,\"comment\":\"%s\",\"magic_number\":%I64d}",
         dealTicket,
         symbol,
         directionStr,
         volume,
         TimeToString(openTime, TIME_DATE|TIME_SECONDS),
         TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
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

      if (dealTicket > g_lastProcessedDealTicket)
         g_lastProcessedDealTicket = dealTicket;
   }

   if (count == 0) return;

   // Build payload
   string url = InpServerUrl + "/api/sync/trades";
   string payload = StringFormat(
      "{\"api_key\":\"%s\",\"platform\":\"MT5\",\"broker\":\"%s\",\"account_number\":\"%d\",\"currency\":\"%s\",\"current_balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"leverage\":%d,\"trades\":[%s]}",
      InpApiKey,
      AccountInfoString(ACCOUNT_COMPANY),
      (int)AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_CURRENCY),
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_MARGIN_FREE),
      (int)AccountInfoInteger(ACCOUNT_LEVERAGE),
      tradesJson
   );

   char postData[];
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1); // remove null terminator

   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";

   int res = WebRequest("POST", url, headers, 10000, postData, resultData, resultHeaders);

   if (res == 200)
   {
      g_lastSyncTime = TimeCurrent();
      if (InpEnableLogging) Print("[TradeLens] Sync successful! Sent ", count, " trades.");
   }
   else
   {
      Print("[TradeLens] WebRequest error (code ", res, "). Check URL whitelist in Tools -> Options -> Expert Advisors.");
      if (ArraySize(resultData) > 0)
      {
         string errResponse = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
         Print("[TradeLens] Response: ", errResponse);
      }
   }
}

//+------------------------------------------------------------------+
//| Send heartbeat to TradeLens                                      |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   string url = InpServerUrl + "/api/sync/heartbeat";
   string payload = StringFormat(
      "{\"api_key\":\"%s\",\"platform\":\"MT5\",\"account_number\":\"%d\",\"balance\":%.2f,\"equity\":%.2f,\"open_positions_count\":%d,\"terminal_version\":\"MT5-%d\"}",
      InpApiKey,
      (int)AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      PositionsTotal(),
      TerminalInfoInteger(TERMINAL_BUILD)
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
