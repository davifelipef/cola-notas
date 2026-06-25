const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

function updateUI(enabled) {
    toggle.checked = enabled;
    status.textContent = enabled ? "Ativo" : "Desativado";
}

chrome.storage.local.get(["enabled"], (res) => {
    updateUI(res.enabled || false);
});

toggle.addEventListener("change", () => {
    chrome.storage.local.set({
        enabled: toggle.checked
    });

    updateUI(toggle.checked);
});