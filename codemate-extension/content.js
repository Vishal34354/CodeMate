function cleanText(element) {
  return (element?.innerText || element?.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function firstText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = cleanText(element);
    if (text) return text;
  }
  return "";
}

function getProblemContext() {
  const url = location.href;
  const isCodeforces = url.includes("codeforces.com");
  const title = isCodeforces
    ? firstText([".title", ".problem-statement .header .title", "h1"]) || document.title
    : firstText(["div[data-cy='question-title']", ".text-title-large", "h1"]) || document.title;

  const statement = isCodeforces
    ? firstText([".problem-statement"])
    : firstText(["div[data-track-load='description_content']", "[data-cy='question-content']", ".elfjS"]);

  // Editor DOMs change frequently. These are best-effort reads; users can paste code manually.
  const editorText = Array.from(document.querySelectorAll(
    "textarea, .monaco-editor .view-lines, .CodeMirror-code, [contenteditable='true']"
  ))
    .map((el) => el.value || cleanText(el))
    .filter((text) => text && text.length > 20)
    .sort((a, b) => b.length - a.length)[0] || "";

  return {
    platform: isCodeforces ? "Codeforces" : "LeetCode",
    title: title.replace(/\s+/g, " ").trim(),
    statement: statement.slice(0, 12000),
    editorText: editorText.slice(0, 12000),
    url,
    pageTitle: document.title
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CODEMATE_READ_PAGE") {
    sendResponse(getProblemContext());
  }
});