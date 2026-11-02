// Dark mode and privacy mode are per-device choices, kept in localStorage

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the choice lasts until the tab closes
  }
};

export const getTheme = () =>
  read("munim-theme") ||
  (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0F141C" : "#FDFDFC");
};

export const setTheme = (theme) => {
  write("munim-theme", theme);
  applyTheme(theme);
};

export const getPrivacy = () => read("munim-privacy") === "on";

export const setPrivacy = (on) => {
  write("munim-privacy", on ? "on" : "off");
  document.documentElement.classList.toggle("privacy", on);
};

export const applyDisplay = () => {
  applyTheme(getTheme());
  document.documentElement.classList.toggle("privacy", getPrivacy());
};
