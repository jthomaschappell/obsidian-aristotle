import { els, DEFAULT_SYSTEM_PROMPT_TEMPLATE } from "./dom.js";

export function setApiKeyUIForSessionStarted() {
  showApiKeySavedUI();
  els.apiKeyInput.disabled = true;
  els.apiKeyInput.type = "password";
  els.saveApiKeyBtn.disabled = true;
  els.cancelApiKeyBtn.disabled = true;
}

export function setApiKeyUIForEditing() {
  showApiKeyEditUI();
  els.apiKeyInput.disabled = false;
  els.saveApiKeyBtn.disabled = false;
  els.cancelApiKeyBtn.disabled = false;
  els.apiKeyInput.value = "";
  els.apiKeyInput.type = "password";
  clearInlineApiKeyError();
  els.apiKeyInput.focus();
}

export function getStoredApiKey() {
  return sessionStorage.getItem("claudeApiKey") || "";
}

export function setStoredApiKey(key) {
  sessionStorage.setItem("claudeApiKey", key);
}

export function showInlineApiKeyError(msg) {
  els.apiKeyError.textContent = msg;
}

export function clearInlineApiKeyError() {
  els.apiKeyError.textContent = "";
}

export function showApiKeySavedUI() {
  els.apiKeyEditWrap.classList.add("hidden");
  els.apiKeySavedWrap.classList.remove("hidden");
  els.apiKeyInput.value = "";
  els.saveApiKeyBtn.disabled = false;
  els.cancelApiKeyBtn.disabled = false;
}

export function showApiKeyEditUI() {
  els.apiKeyEditWrap.classList.remove("hidden");
  els.apiKeySavedWrap.classList.add("hidden");
  els.apiKeyInput.disabled = false;
  els.saveApiKeyBtn.disabled = false;
  els.cancelApiKeyBtn.disabled = false;
}

export function getEnvPrefillKey() {
  if (typeof window.__API_KEY_FROM_ENV__ === "string" && window.__API_KEY_FROM_ENV__.trim() !== "") {
    return window.__API_KEY_FROM_ENV__.trim();
  }
  return "";
}

export function getApiKey() {
  const fromInput = els.apiKeyInput.value.trim();
  if (fromInput) return fromInput;
  return getStoredApiKey().trim();
}

export function clearStoredApiKey() {
  sessionStorage.removeItem("claudeApiKey");
}

export function getStoredPromptTemplate() {
  return sessionStorage.getItem("studyPromptTemplate") || "";
}

export function setStoredPromptTemplate(t) {
  sessionStorage.setItem("studyPromptTemplate", t);
}

export function clearStoredPromptTemplate() {
  sessionStorage.removeItem("studyPromptTemplate");
}

export function getActivePromptTemplate() {
  return getStoredPromptTemplate() || DEFAULT_SYSTEM_PROMPT_TEMPLATE;
}

export function showPromptEditUI() {
  els.promptEditWrap.classList.remove("hidden");
  els.promptSavedWrap.classList.add("hidden");
  els.promptInput.value = getActivePromptTemplate();
  els.promptInput.focus();
}

export function showPromptSavedUI() {
  els.promptEditWrap.classList.add("hidden");
  els.promptSavedWrap.classList.remove("hidden");
  const isCustom = !!getStoredPromptTemplate();
  els.promptSavedLabel.textContent = isCustom ? "Custom prompt active" : "Default prompt active";
}

export function commitPrompt() {
  const val = els.promptInput.value.trim();
  if (!val || val === DEFAULT_SYSTEM_PROMPT_TEMPLATE) {
    clearStoredPromptTemplate();
  } else {
    setStoredPromptTemplate(val);
  }
  showPromptSavedUI();
}

export function commitApiKeyFromInput() {
  const k = els.apiKeyInput.value.trim();
  if (k) {
    setStoredApiKey(k);
    showApiKeySavedUI();
    clearInlineApiKeyError();
    return true;
  }
  if (getStoredApiKey().trim()) {
    showInlineApiKeyError("Paste a new key to replace the saved one, or click Cancel to keep it.");
  } else {
    showInlineApiKeyError("Paste your API key.");
  }
  return false;
}

export function cancelApiKeyEdit() {
  clearInlineApiKeyError();
  els.apiKeyInput.value = "";
  els.apiKeyInput.type = "password";
  if (getStoredApiKey().trim()) {
    showApiKeySavedUI();
  }
}
