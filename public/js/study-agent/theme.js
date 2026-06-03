import { els } from "./dom.js";

export const THEME_KEY = "study-agent-theme";

export function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
  els.themeSunIcon.classList.toggle("hidden", isLight);
  els.themeMoonIcon.classList.toggle("hidden", !isLight);
}
