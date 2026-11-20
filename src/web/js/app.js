/* BrandGame - https://github.com/p-darksy-r/BrandGame - Copyright (c) 2026 p-darksy-r */

// --- MASTER BOOTSTRAP INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const headerVer = document.getElementById("header-version-badge");
    if (headerVer) headerVer.textContent = `v${GAME_VERSION}`;
    const footerVer = document.getElementById("footer-version-text");
    if (footerVer) footerVer.textContent = GAME_VERSION;

    setupPresentation();

    // Load configurations from either C# Webview Host or Fallback Browser Sandbox
    sendNativeRequest({ Action: "load_save" });
    setupEventHandlers();
    populateLocalLogoOptions();
    populatePageSelectDropdown();
    showScreen("screen-main-menu");
});
