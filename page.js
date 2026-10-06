(() => {
    if (window.__colarNotasPageInstalled) return;

    window.__colarNotasPageInstalled = true;

    let renderer = null;

    function tentarCapturarRenderer() {
        if (!window.Blazor?._internal?.attachWebRendererInterop) {
            return false;
        }

        if (window.__colarNotasAttachPatched) {
            return true;
        }

        const original =
            window.Blazor._internal.attachWebRendererInterop;

        window.Blazor._internal.attachWebRendererInterop = function (
            rendererId,
            rendererInterop,
            jsCallDispatcher,
            jsCallDispatcherOptions
        ) {
            renderer = rendererInterop;

            window.__colarNotasRenderer = renderer;

            console.log(
                "[EXTENSÃO] Renderer Blazor capturado:",
                rendererId,
                renderer
            );

            return original.call(
                this,
                rendererId,
                rendererInterop,
                jsCallDispatcher,
                jsCallDispatcherOptions
            );
        };

        window.__colarNotasAttachPatched = true;

        return true;
    }

    const intervalo = setInterval(() => {
        if (tentarCapturarRenderer()) {
            clearInterval(intervalo);
        }
    }, 10);

    function obterCampos() {
        return Array.from(
            document.querySelectorAll(".nota")
        );
    }

    function obterHandler(campo) {
        const blazorKey = Object.keys(campo).find(
            key => key.startsWith("_blazorEvents_")
        );

        if (!blazorKey) return null;

        return campo[blazorKey]?.handlers?.change ?? null;
    }

    function capturarDadosBlazor() {
        const campos = obterCampos();

        return campos.map((campo, index) => {
            const handler = obterHandler(campo);

            return {
                indice: index + 1,
                valor: campo.value,
                blazorKey: Object.keys(campo).find(
                    key => key.startsWith("_blazorEvents_")
                ) || null,
                eventHandlerId: handler?.eventHandlerId ?? null,
                eventName: handler?.eventName ?? null,
                componentId: handler?.renderingComponentId ?? null,
                elementMatch: handler?.element === campo
            };
        });
    }

    async function processarNotas(valores, startIndex) {
        if (!renderer) {
            throw new Error("Renderer Blazor não capturado.");
        }

        const campos = obterCampos();

        const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value"
        ).set;

        const resultados = [];

        for (let i = 0; i < valores.length; i++) {
            const indice = startIndex + i;
            const campo = campos[indice];

            if (!campo) {
                console.warn(
                    "[EXTENSÃO] Não existe campo para o índice:",
                    indice
                );

                break;
            }

            const valor = String(valores[i]);

            const handler = obterHandler(campo);

            if (!handler) {
                throw new Error(
                    `Handler Blazor não encontrado no campo ${indice + 1}.`
                );
            }

            /*
             * Primeiro atualizamos o valor do input.
             */
            setter.call(campo, valor);

            /*
             * Depois obtemos os dados atuais do handler.
             * Isso é importante porque o Blazor pode recriar
             * os handlers durante um rerender.
             */
            const descriptor = {
                eventHandlerId: handler.eventHandlerId,
                eventName: "change",
                eventFieldInfo: {
                    componentId: handler.renderingComponentId,
                    fieldValue: valor
                }
            };

            const eventArgs = {
                value: valor
            };

            console.log(
                `[EXTENSÃO] Nota ${i + 1}/${valores.length}: enviando`,
                {
                    valor,
                    eventHandlerId: handler.eventHandlerId,
                    componentId: handler.renderingComponentId
                }
            );

            /*
             * Espera a confirmação do próprio Blazor antes
             * de continuar para a próxima nota.
             */
            await renderer.invokeMethodAsync(
                "DispatchEventAsync",
                descriptor,
                eventArgs
            );

            resultados.push({
                indice: indice + 1,
                valor,
                eventHandlerId: handler.eventHandlerId,
                componentId: handler.renderingComponentId,
                valorDepois: campo.value
            });

            console.log(
                `[EXTENSÃO] Nota ${i + 1}/${valores.length}: confirmada`
            );
        }

        return resultados;
    }

    window.addEventListener("message", async (event) => {
        if (event.source !== window) return;

        const tipo = event.data?.type;

        if (tipo === "COLAR_NOTAS_BLAZOR_CAPTURAR") {
            const dados = capturarDadosBlazor();

            window.postMessage(
                {
                    type: "COLAR_NOTAS_BLAZOR_RESULTADO",
                    dados
                },
                "*"
            );

            return;
        }

        if (tipo === "COLAR_NOTAS_BLAZOR_PROCESSAR") {
            try {
                const valores = event.data.valores || [];
                const startIndex = event.data.startIndex || 0;

                console.log(
                    "[EXTENSÃO] Iniciando processamento sequencial:",
                    valores
                );

                const resultados = await processarNotas(
                    valores,
                    startIndex
                );

                console.log(
                    "[EXTENSÃO] Todas as notas processadas:",
                    resultados
                );

                window.postMessage(
                    {
                        type: "COLAR_NOTAS_BLAZOR_PROCESSAMENTO_RESULTADO",
                        sucesso: true,
                        resultados
                    },
                    "*"
                );
            } catch (erro) {
                console.error(
                    "[EXTENSÃO] Erro ao processar notas:",
                    erro
                );

                window.postMessage(
                    {
                        type: "COLAR_NOTAS_BLAZOR_PROCESSAMENTO_RESULTADO",
                        sucesso: false,
                        erro: String(erro)
                    },
                    "*"
                );
            }
        }
    });
})();