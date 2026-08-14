//+------------------------------------------------------------------+
//|                                              TradeLensSync.mq4   |
//|                              TradeLens - MT4 Trade Sync EA       |
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
string syncedTickets = "";

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

    // Get history for the period
    HistorySelect(fromTime, toTime);

    int total = HistoryDealsTotal();
    if(total == 0) return;

    // Build JSON array of trades
    string jsonTrades = "[";

    for(int i = 0; i < total; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket == 0) continue;

        // Only closed positions (deal out)
        long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
        if(entry != DEAL_ENTRY_OUT) continue;

        string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
        long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
        double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
        double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
        double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
        double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
        double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
        datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
        string comment = HistoryDealGetString(ticket, DEAL_COMMENT);
        long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);

        // Find the opening deal to get open price and time
        double openPrice = 0;
        datetime openTime = 0;
        double stopLoss = 0;
        double takeProfit = 0;

        // Get position ID to find entry deal
        long posId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
        for(int j = 0; j < total; j++)
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

        // Fallback if we couldn't find open price
        if(openPrice == 0) openPrice = price;

        string tradeType = (type == DEAL_TYPE_SELL) ? "SELL" : "BUY";

        string tradeJson = StringFormat(
            "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"trade_type\":\"%s\",\"volume\":%.2f," +
            "\"open_time\":\"%s\",\"close_time\":\"%s\",\"open_price\":%.5f,\"close_price\":%.5f," +
            "\"stop_loss\":%.5f,\"take_profit\":%.5f,\"profit\":%.2f,\"commission\":%.2f," +
            "\"swap\":%.2f,\"comment\":\"%s\",\"magic_number\":%d}",
            ticket, EscapeJson(symbol), tradeType, volume,
            IsoTime(openTime), IsoTime(closeTime), openPrice, price,
            stopLoss, takeProfit, profit, commission,
            swap, EscapeJson(comment), (int)magic
        );

        if(StringLen(jsonTrades) > 1) jsonTrades += ",";
        jsonTrades += tradeJson;
    }

    jsonTrades += "]";

    // Check if we have trades to send
    if(jsonTrades == "[]")
    {
        lastSync = toTime;
        return;
    }

    // Build full request body
    string body = StringFormat("{\"token\":\"%s\",\"trades\":%s}", ConnectionToken, jsonTrades);

    // Send HTTP POST
    string headers = "Content-Type: application/json\r\n";
    char post[];
    StringToCharArray(body, post, 0, StringLen(body));

    string response;
    int result = SendHTTPRequest(WebhookURL, "POST", headers, post, response);

    if(result == 0)
    {
        Print("Synced trades successfully. Response: ", response);
        lastSync = toTime;
    }
    else
    {
        Print("Failed to sync trades. Error: ", result);
    }
}

//+------------------------------------------------------------------+
//| Helper: Convert datetime to ISO 8601 string                      |
//+------------------------------------------------------------------+
string IsoTime(datetime t)
{
    return TimeToString(t, TIME_DATE | TIME_SECONDS) + "Z";
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

//+------------------------------------------------------------------+
//| Helper: Send HTTP request                                        |
//+------------------------------------------------------------------+
int SendHTTPRequest(string url, string method, string headers, char &data[], string &response)
{
    int timeout = 30000;

    string httpMethod = method;
    string httpHeaders = headers;

    char responseData[];
    string responseHeaders;

    int result = WebRequest(httpMethod, url, httpHeaders, timeout, data, responseData, responseHeaders);

    if(result == -1)
    {
        // Try with different approach
        Print("WebRequest failed. Make sure URL is allowed in Tools > Options > Expert Advisors");
        return -1;
    }

    response = CharArrayToString(responseData, 0, WHOLE_ARRAY, CP_UTF8);
    return 0;
}
