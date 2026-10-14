import { useEffect, useRef, useState } from "react";
import { Monitor, RefreshCw } from "lucide-react";
import { runtimeJson } from "../runtime";
type Status = {
  active: boolean;
  remote?: boolean;
  desktopUrl?: string;
  background: boolean;
  authenticated: boolean;
  pending: { item: string; phase: string;processorExpired?:boolean;lastStage?:string;lastStageMs?:number } | null;
};
export function SteamConnection() {
  const [preparationAllowed,setPreparationAllowed]=useState<boolean>();
  const dialog = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const [value,policy]=await Promise.all([
          runtimeJson<Status>("steam/status", undefined, {signal:controller.signal}),
          runtimeJson<{enabled:boolean}>("steam/policy",undefined,{signal:controller.signal})
        ]);
        if (!controller.signal.aborted) {
          setStatus(value);
          setPreparationAllowed(policy.enabled);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Steam indisponível.",
          );
      } finally {
        if (!controller.signal.aborted)
          timer = setTimeout(() => void refresh(), 5000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  async function action(action: string) {
    setBusy(true);
    setError("");
    try {
      setStatus(
        await runtimeJson<Status>("steam/session", {
          action,
          ...(action === "close-pending" ? { checked } : {}),
        }),
      );
      if (action === "close-pending") {
        dialog.current?.close();
        setChecked(false);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível conectar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="connection-card" aria-label="Steam em segundo plano">
      <h3>
        <Monitor size={18} /> Steam em segundo plano
      </h3>
      <p role="status">
        {status?.authenticated
          ? status.background
            ? "Conectada · em segundo plano"
            : "Conectada · janela de login aberta"
          : "Faça o login uma vez no Firefox separado da Pam."}
      </p>
      <p>
        Entre na sua conta e conclua o Steam Guard na janela que abrir. Depois,
        ative o segundo plano. A Pam não usa a janela do aplicativo Steam.
      </p>
      {status?.desktopUrl && <a href={status.desktopUrl} target="_blank" rel="noreferrer">Abrir Firefox no servidor</a>}
      <label>
        <input type="checkbox" checked={preparationAllowed===true} disabled={busy||preparationAllowed===undefined} onChange={event=>{
          const enabled=event.target.checked;setBusy(true);
          void runtimeJson<{enabled:boolean}>("steam/policy",{enabled}).then(value=>{setPreparationAllowed(value.enabled);setError("")}).catch(error=>setError(error instanceof Error?error.message:"Não foi possível salvar a autorização.")).finally(()=>setBusy(false));
        }}/>{" "}Autorizar a Pam a preparar Pix da Steam sem pedir novamente
      </label>
      <p>Inclui preencher os dados protegidos no PagSeguro e gerar o QR. Você faz o pagamento.</p>
      <div className="connections-actions">
        <button disabled={busy} onClick={() => void action("login")}>
          Conectar conta Steam
        </button>
        <button
          disabled={busy || !status?.authenticated}
          onClick={() => void action("background")}
        >
          <RefreshCw size={14} /> Ativar segundo plano
        </button>
      </div>
      {status?.pending && (
        <div>
          <p>
            Pedido em preparação: {status.pending.item}. A Pam deve conferir
            esse pedido antes de iniciar outro.
          </p>
          {status.pending.processorExpired&&<p role="status">O checkout expirou no processador. Confira o histórico da Steam antes de preparar outro pedido.</p>}
          {status.pending.lastStage&&<p>Última etapa: {status.pending.lastStage}{status.pending.lastStageMs!==undefined?` · ${(status.pending.lastStageMs/1000).toFixed(1)} s`:''}.</p>}
          <button
            disabled={busy}
            onClick={() => {
              setChecked(false);
              dialog.current?.showModal();
            }}
          >
            Encerrar acompanhamento
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setChecked(false)}
        aria-labelledby="steam-pending-title"
      >
        <h3 id="steam-pending-title">Conferir pedido pendente</h3>
        <p>
          Encerre o acompanhamento apenas depois de conferir no histórico da
          Steam que o pedido foi pago, cancelado ou expirou. Esta ação libera
          uma nova preparação; ela não cancela o pedido na Steam.
        </p>
        <label>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />{" "}
          Conferi o pedido no histórico da Steam.
        </label>
        <div className="connections-actions">
          <button
            disabled={busy || !checked}
            onClick={() => void action("close-pending")}
          >
            Encerrar acompanhamento
          </button>
          <button disabled={busy} onClick={() => dialog.current?.close()}>
            Voltar
          </button>
        </div>
      </dialog>
      {error && (
        <p role="alert" className="connections-error">
          {error}
        </p>
      )}
    </article>
  );
}
