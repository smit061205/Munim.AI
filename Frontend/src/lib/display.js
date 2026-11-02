// Privacy mode is a per-device choice, kept in localStorage

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

export const getPrivacy = () => read("munim-privacy") === "on";

export const setPrivacy = (on) => {
  write("munim-privacy", on ? "on" : "off");
  document.documentElement.classList.toggle("privacy", on);
  window.dispatchEvent(new Event("munim-display"));
};

export const applyDisplay = () => {
  // The app is light only. An old dark-mode choice is cleared.
  delete document.documentElement.dataset.theme;
  try {
    localStorage.removeItem("munim-theme");
  } catch {
    // Nothing stored to clear
  }
  document.documentElement.classList.toggle("privacy", getPrivacy());
};
