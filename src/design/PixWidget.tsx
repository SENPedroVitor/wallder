import {useState} from 'react';
export type PixData = {
  id: string;
  item: string;
  total: number;
  pix?: number;
  image: string;
  code?:string;
};
export function PixWidget({ data }: { data: PixData }) {
  const [copyStatus,setCopyStatus]=useState('');
  if (
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.image) ||
    !Number.isFinite(data.total) ||
    data.total <= 0
  )
    return (
      <section className="official-widget pix-widget" role="alert">
        Não foi possível carregar o QR Code deste pedido.
      </section>
    );
  const format = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <section className="official-widget pix-widget" aria-label="Pix da Steam">
      <h3>{data.item}</h3>
      <p>Total: {format(data.total)}</p>
      {data.pix !== undefined && <p>Pix: {format(data.pix)}</p>}
      <img
        src={data.image}
        alt="QR Code Pix gerado pelo processador da Steam"
        width={240}
        height={240}
      />
      {data.code&&<div><button onClick={()=>{void navigator.clipboard.writeText(data.code!).then(()=>setCopyStatus('Código copiado.')).catch(()=>setCopyStatus('Não foi possível copiar. Selecione o código abaixo.'))}}>Copiar código Pix</button><textarea readOnly aria-label="Código Pix copia e cola" value={data.code}/><p role="status">{copyStatus}</p></div>}
      <p>
        Confira o valor e o destinatário no banco antes de pagar. Este código
        pertence ao pedido mostrado acima; a validade é definida pelo
        processador.
      </p>
    </section>
  );
}
