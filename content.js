let extensionEnabled = false;

chrome.storage.local.get(["enabled"], (result) => {
    extensionEnabled = result.enabled || false;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        extensionEnabled = changes.enabled.newValue;
    }
});

let dadosBlazor = null;

window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === "COLAR_NOTAS_BLAZOR_RESULTADO") {
        dadosBlazor = event.data.dados;

        console.log("[EXTENSÃO] Dados Blazor capturados:");
        console.table(dadosBlazor);

        return;
    }

    if (
        event.data?.type ===
        "COLAR_NOTAS_BLAZOR_PROCESSAMENTO_RESULTADO"
    ) {
        if (event.data.sucesso) {
            console.log(
                "[EXTENSÃO] PROCESSAMENTO CONCLUÍDO:",
                event.data.resultados
            );

            console.table(event.data.resultados);
        } else {
            console.error(
                "[EXTENSÃO] PROCESSAMENTO FALHOU:",
                event.data.erro
            );
        }

        return;
    }
});

function solicitarDadosBlazor() {
    dadosBlazor = null;

    window.postMessage(
        {
            type: "COLAR_NOTAS_BLAZOR_CAPTURAR"
        },
        "*"
    );
}

document.addEventListener("paste", function (e) {
    if (!extensionEnabled) return;

    const target = e.target;

    if (!target.classList.contains("nota")) return;

    const text = e.clipboardData.getData("text");

    const valores = text
        .split(/\r?\n/)
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => v.replace(",", "."));

    if (!valores.length) return;

    const campos = Array.from(
        document.querySelectorAll(".nota")
    );

    const startIndex = campos.indexOf(target);

    if (startIndex === -1) return;

    e.preventDefault();

    console.log(
        "[EXTENSÃO] Notas recebidas do clipboard:",
        valores
    );

    window.postMessage(
        {
            type: "COLAR_NOTAS_BLAZOR_PROCESSAR",
            valores,
            startIndex
        },
        "*"
    );
});