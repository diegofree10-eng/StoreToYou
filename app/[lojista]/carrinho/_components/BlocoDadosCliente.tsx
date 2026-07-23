"use client";

interface BlocoDadosClienteProps {
  cliente: { nmNomeCliente: string; dsCpfCliente: string; dsCepCliente: string; dsTelefoneCliente: string; dsEmailCliente?: string };
  setCliente: (cliente: any) => void;
  endereco: { dsRuaCliente: string; dsNumeroCliente: string; dsBairroCliente: string; dsCidadeCliente: string; dsUfCliente: string; dsComplementoCliente: string };
  setEndereco: (endereco: any) => void;
  handleCepChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cpfValido: boolean;
  aplicarMascaraCPF: (valor: string) => string;
  config: { corTexto: string };
  stylesInput: any;
  temItemDigital: boolean;
}

export default function BlocoDadosCliente({
  cliente,
  setCliente,
  endereco,
  setEndereco,
  handleCepChange,
  cpfValido,
  aplicarMascaraCPF,
  config,
  stylesInput,
  temItemDigital
}: BlocoDadosClienteProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .bloco-dados-cliente-container {
            max-height: none !important;
            height: auto !important;
            overflow-y: visible !important;
            padding-bottom: 25px !important;
          }
          .bloco-dados-linha {
            flex-wrap: wrap !important;
          }
          .bloco-dados-linha > input {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
        }
      `}} />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', height: '100%', boxSizing: 'border-box', border: '1px solid #f1f5f9', overflowY: 'auto', maxHeight: '310px' }} className="bloco-dados-cliente-container">
        <h4 style={{ color: config.corTexto, margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>DADOS DO CLIENTE & ENDEREÇO</h4>

        <input
          placeholder="Nome Completo *"
          style={stylesInput.inputStyle}
          value={cliente.nmNomeCliente || ""}
          onChange={e => setCliente((prev: any) => ({ ...prev, nmNomeCliente: e.target.value }))}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }} className="bloco-dados-linha">
          <input
            placeholder="WhatsApp *"
            style={{ ...stylesInput.inputStyle, flex: 1, marginBottom: 0 }}
            value={cliente.dsTelefoneCliente || ""}
            onChange={e => {
              const valor = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
              setCliente((prev: any) => ({ ...prev, dsTelefoneCliente: valor }));
            }}
          />
          <input
            placeholder="CPF *"
            style={{ ...stylesInput.inputStyle, flex: 1, marginBottom: 0 }}
            value={cliente.dsCpfCliente || ""}
            onChange={e => setCliente((prev: any) => ({ ...prev, dsCpfCliente: aplicarMascaraCPF(e.target.value) }))}
          />
        </div>
        {!cpfValido && <p style={{ color: '#ff4d4d', fontSize: '10px', margin: '0 0 6px 0', fontWeight: 'bold' }}>⚠️ CPF inválido</p>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }} className="bloco-dados-linha">
          <input
            placeholder="CEP *"
            style={{ ...stylesInput.inputStyle, flex: '1.2', marginBottom: 0 }}
            value={cliente.dsCepCliente || ""}
            onChange={handleCepChange}
          />
          <input
            placeholder="Rua / Avenida"
            style={{ ...stylesInput.inputStyle, flex: '3', backgroundColor: '#f1f5f9', marginBottom: 0 }}
            value={endereco.dsRuaCliente || ""}
            readOnly
          />
          <input
            placeholder="Nº *"
            style={{ ...stylesInput.inputStyle, flex: '0.8', marginBottom: 0 }}
            value={endereco.dsNumeroCliente || ""}
            onChange={e => {
              const num = e.target.value.replace(/\D/g, "");
              setEndereco((prev: any) => ({ ...prev, dsNumeroCliente: num }));
            }}
          />
        </div>

        <input
          placeholder="Complemento / Ponto de referência"
          style={stylesInput.inputStyle}
          value={endereco.dsComplementoCliente || ""}
          onChange={e => setEndereco((prev: any) => ({ ...prev, dsComplementoCliente: e.target.value }))}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: temItemDigital ? '8px' : '0' }} className="bloco-dados-linha">
          <input placeholder="Bairro" value={endereco.dsBairroCliente || ""} style={{ ...stylesInput.inputStyle, flex: '1.5', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
          <input placeholder="Cidade" value={endereco.dsCidadeCliente || ""} style={{ ...stylesInput.inputStyle, flex: '2', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
          <input placeholder="UF" value={endereco.dsUfCliente || ""} style={{ ...stylesInput.inputStyle, flex: '0.6', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
        </div>

        {/* CAMPO DE E-MAIL CONDICIONAL (EXIBIDO APENAS SE HOUVER ITEM DIGITAL) */}
        {temItemDigital && (
          <div style={{ marginTop: '8px' }}>
            <input
              type="email"
              placeholder="E-mail para receber o produto digital *"
              style={{ ...stylesInput.inputStyle, marginBottom: 0, borderColor: '#0284c7' }}
              value={cliente.dsEmailCliente || ""}
              onChange={e => setCliente((prev: any) => ({ ...prev, dsEmailCliente: e.target.value }))}
            />
            <small style={{ display: 'block', fontSize: '10px', color: '#0369a1', marginTop: '3px', fontWeight: '500' }}>
              ✉️ Necessário para o envio do arquivo ou acesso digital.
            </small>
          </div>
        )}

      </div>
    </>
  );
}
//Um painel com rolagem interna (maxHeight: '310px') contendo os inputs do formulário de identificação
// (Nome, WhatsApp, CPF com validação visual e CEP integrado ao ViaCEP para preenchimento
// automático de logradouro e bairro).