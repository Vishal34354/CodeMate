chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CODEMATE_GET_TAB_CONTEXT") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active tab found." });
        return;
      }
      try {
        const context = await chrome.tabs.sendMessage(tab.id, { type: "CODEMATE_READ_PAGE" });
        sendResponse({ ok: true, context, tab: { id: tab.id, url: tab.url || "" } });
      } catch {
        sendResponse({
          ok: false,
          error: "Open a LeetCode problem or Codeforces problem page, then refresh it and try again."
        });
      }
    }).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});