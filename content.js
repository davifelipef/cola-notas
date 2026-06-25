let extensionEnabled = false;

// carrega estado salvo
chrome.storage.local.get(["enabled"], (result) => {
    extensionEnabled = result.enabled || false;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        extensionEnabled = changes.enabled.newValue;
    }
});

document.addEventListener("paste", function (e) {
    if (!extensionEnabled) return;

    const target = e.target;

    if (!target.classList.contains("nota")) return;

    const text = (e.clipboardData || window.clipboardData)
        .getData("text");

    const valores = text
        .split(/\r?\n/)
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => v.replace(",", "."));

    const campos = Array.from(document.querySelectorAll(".nota"));

    const startIndex = campos.indexOf(target);
    if (startIndex === -1) return;

    e.preventDefault();

    const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
    ).set;

    for (let i = 0; i < valores.length; i++) {
        const campo = campos[startIndex + i];
        if (!campo) break;

        setter.call(campo, valores[i]);

        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.dispatchEvent(new Event("change", { bubbles: true }));
    }
});