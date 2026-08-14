//+------------------------------------------------------------------+
//|                                              TradeLensSync.mq5   |
//|                              TradeLens - MT5 Trade Sync EA       |
//+------------------------------------------------------------------+
#property copyright "TradeLens"
#property version   "1.00"
#property strict

// Input parameters
input string WebhookURL = "YOUR_WEBHOOK_URL_HERE";  // TradeLens webhook URL
input string ConnectionToken = "YOUR_TOKEN_HERE";   // TradeLens connection token
input int    SyncIntervalMinutes = 5;                // How often to sync (minutes)
input bool   SyncHistoryOnStart = true;              // Sync all history on first run

// Globals
datetime lastSync = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("TradeLens Sync EA started");
    Print("Webhook URL: ", WebhookURL);
    Print("Sync interval: ", SyncIntervalMinutes, " minutes");

    if(StringFind(WebhookURL, "YOUR_WEBHOOK_URL") >= 0)
    {
        Print("ERROR: Please set your WebhookURL in the EA inputs!");
        return INIT_PARAMETERS_INCORRECT;
    }

    if(StringFind(ConnectionToken, "YOUR_TOKEN") >= 0)
    {
        Print("ERROR: Please set your ConnectionToken in the EA inputs!");
        return INIT_PARAMETERS_INCORRECT;
    }

    if(SyncHistoryOnStart)
    {
        lastSync = 0;
    }
    else
    {
        lastSync = TimeCurrent();
    }

    EventSetTimer(SyncIntervalMinutes * 60);
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    Print("TradeLens Sync EA stopped");
}

//+------------------------------------------------------------------+
//| Timer function - runs on sync interval                           |
//+------------------------------------------------------------------+
void OnTimer()
{
    SyncTrades();
}

//+------------------------------------------------------------------+
//| Sync closed trades to TradeLens                                  |
//+------------------------------------------------------------------+
void SyncTrades()
{
    datetime fromTime = lastSync;
    datetime toTime = TimeCurrent();

    // Select history deals
    if(!HistorySelect(fromTime, toTime))
    {
        Print("Failed to select history");
        return;
    }

    int totalDeals = HistoryDealsTotal();
    if(totalDeals == 0)
    {
        lastSync = toTime;
        return;
    }

    // Build JSON array
    string jsonTrades = "[";

    for(int i = 0; i < totalDeals; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket == 0) continue;

        // Only exit deals (closed positions)
        long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
        if(entryType != DEAL_ENTRY_OUT) continue;

        string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
        long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
        double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
        double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
        double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
        double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
        double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
        datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
        string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
        long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);

        // Find the entry deal to get open price/time
        double openPrice = closePrice;
        datetime openTime = closeTime;
        double stopLoss = 0;
        double takeProfit = 0;

        long posId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

        for(int j = 0; j < totalDeals; j++)
        {
            ulong t2 = HistoryDealGetTicket(j);
            if(t2 == 0) continue;
            long p2 = HistoryDealGetInteger(t2, DEAL_POSITION_ID);
            long e2 = HistoryDealGetInteger(t2, DEAL_ENTRY);
            if(p2 == posId && e2 == DEAL_ENTRY_IN)
            {
                openPrice = HistoryDealGetDouble(t2, DEAL_PRICE);
                openTime = (datetime)HistoryDealGetInteger(t2, DEAL_TIME);
                break;
            }
        }

        string tradeType = (dealType == DEAL_TYPE_SELL) ? "SELL" : "BUY";

        string tradeJson = StringFormat(
            "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f," +
            "\"open_time\":\"%s\",\"close_time\":\"%s\",\"open_price\":%.5f,\"close_price\":%.5f," +
            "\"stop_loss\":%.5f,\"take_profit\":%.5f,\"profit\":%.2f,\"commission\":%.2f," +
            "\"swap\":%.2f,\"comment\":\"%s\",\"magic_number\":%d}",
            ticket, EscapeJson(symbol), tradeType, volume,
            IsoTime(openTime), IsoTime(closeTime), openPrice, closePrice,
            stopLoss, takeProfit, profit, commission,
            swap, EscapeJson(comment), (int)magic
        );

        if(StringLen(jsonTrades) > 1) jsonTrades += ",";
        jsonTrades += tradeJson;
    }

    jsonTrades += "]";

    if(jsonTrades == "[]")
    {
        lastSync = toTime;
        return;
    }

    // Build request body
    string body = StringFormat("{\"token\":\"%s\",\"trades\":%s}", ConnectionToken, jsonTrades);

    // Send HTTP POST request
    char postData[];
    StringToCharArray(body, postData, 0, StringLen(body), CP_UTF8);

    string headers = "Content-Type: application/json\r\n";
    string resultHeaders;
    char responseData[];

    int timeout = 30000;

    int httpResult = WebRequest("POST", WebhookURL, headers, timeout, postData, responseData, resultHeaders);

    if(httpResult == 200 || httpResult == 201)
    {
        string response = CharArrayToString(responseData, 0, WHOLE_ARRAY, CP_UTF8);
        Print("Synced trades successfully (HTTP ", httpResult, "). Response: ", response);
        lastSync = toTime;
    }
    else if(httpResult == -1)
    {
        Print("WebRequest failed. Make sure URL is added to Tools > Options > Expert Advisors > Allow WebRequest for listed URL");
    }
    else
    {
        Print("Sync failed. HTTP status: ", httpResult);
    }
}

//+------------------------------------------------------------------+
//| Helper: Convert datetime to ISO 8601 string                      |
//+------------------------------------------------------------------+
string IsoTime(datetime t)
{
    // Format: YYYY.MM.DD HH:MM:SS -> convert to ISO
    string s = TimeToString(t, TIME_DATE | TIME_SECONDS);
    StringReplace(s, ".", "-");
    return s + "Z";
}

//+------------------------------------------------------------------+
//| Helper: Escape JSON string values                                |
//+------------------------------------------------------------------+
string EscapeJson(string s)
{
    StringReplace(s, "\\", "\\\\");
    StringReplace(s, "\"", "\\\"");
    StringReplace(s, "\n", "\\n");
    StringReplace(s, "\r", "\\r");
    StringReplace(s, "\t", "\\t");
    return s;
}
