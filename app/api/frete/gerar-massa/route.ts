import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Força a rota a ser tratada como dinâmica no runtime
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Leitura segura do body
    const body = await request.json().catch(() => ({}));
    const { lojistaId, orders } = body;

    if (!lojistaId || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // 2. Busca do Lojista no Firestore Admin
    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data() || {};
    
    // 🎯 CORRIGIDO: Puxa o token de dentro de 'sistema' ou da raiz
    const token = dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio;
    
    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado para este lojista." }, { status: 400 });
    }

    const baseUrl = dadosLoja.melhorEnvioSandbox 
      ? 'https://sandbox.melhorenvio.com.br' 
      : 'https://melhorenvio.com.br';

    const results: any[] = [];
    const errors: any[] = [];

    // 3. Processamento dos pedidos
    for (const p of orders) {
      const itens = Array.isArray(p.itens) ? p.itens : [];
      const itensFisicos = itens.filter((item: any) => item.precisaFrete !== false);
      
      if (itensFisicos.length === 0) continue;

      // Cálculo de dimensões e peso
      const totalFisico = itensFisicos.reduce((acc: any, item: any) => {
        const qty = Number(item.qty || item.quantidade || 1);
        return {
          peso: acc.peso + (Number(item.peso || 0.3) * qty),
          largura: Math.max(acc.largura, Number(item.largura || 15)),
          altura: Math.max(acc.altura, Number(item.altura || 10)),
          comprimento: Math.max(acc.comprimento, Number(item.comprimento || 15)),
          valor: acc.valor + (Number(item.preco || item.price || 0) * qty),
        };
      }, { peso: 0, largura: 0, altura: 0, comprimento: 0, valor: 0 });

      const serviceId = Number(p.financeiro?.dsTransportadoraId || 0);
      const pedidoRef = db.collection("lojistas").doc(lojistaId).collection("pedidos").doc(String(p.id));

      const payloadCart = {
        service: serviceId,
        from: {
          name: String(dadosLoja?.dadosLoja?.dsNomeLoja || dadosLoja.nomeLoja || "Loja"),
          phone: String(dadosLoja?.dadosLoja?.nrWhatssapLoja || dadosLoja.whatsapp || "0000000000").replace(/\D/g, ""),
          email: String(dadosLoja.email || "contato@loja.com"),
          document: String(dadosLoja?.dadosLoja?.nrCnpjCpfLoja || dadosLoja.cnpj || "").replace(/\D/g, ""),
          address: String(dadosLoja?.dadosLoja?.dsRuaLoja || dadosLoja.ruaOrigem || "Endereço"),
          number: String(dadosLoja?.dadosLoja?.nrNumeroLoja || dadosLoja.numeroOrigem || "S/N"),
          district: String(dadosLoja?.dadosLoja?.dsBairroLoja || dadosLoja.bairroOrigem || ""),
          city: String(dadosLoja?.dadosLoja?.dsCidadeLoja || dadosLoja.cidadeOrigem || ""),
          state_abbr: String(dadosLoja?.dadosLoja?.dsUfLoja || dadosLoja.ufOrigem || "SP"),
          postal_code: String(dadosLoja?.dsCepLoja || dadosLoja?.dadosLoja?.dsCepLoja || dadosLoja.cepOrigem || "").replace(/\D/g, ""),
        },
        to: {
          name: String(p.cliente?.nmNome || p.cliente?.nome || "Cliente"),
          phone: String(p.cliente?.dsTelefone || p.cliente?.telefone || "0000000000").replace(/\D/g, ""),
          email: String(p.cliente?.dsEmail || p.cliente?.email || "cliente@email.com"),
          document: String(p.cliente?.dsCpf || p.cliente?.cpf || "").replace(/\D/g, ""),
          address: String(p.endereco?.dsRua || p.endereco?.rua || ""),
          number: String(p.endereco?.dsNumero || p.endereco?.numero || "S/N"),
          complement: String(p.endereco?.dsComplemento || ""),
          district: String(p.endereco?.dsBairro || p.endereco?.bairro || ""),
          city: String(p.endereco?.dsCidade || p.endereco?.cidade || ""),
          state_abbr: String(p.endereco?.dsUf || p.endereco?.uf || "SP"),
          postal_code: String(p.endereco?.dsCep || p.endereco?.cep || "").replace(/\D/g, "").replace(/\D/g, ""),
        },
        products: itens.map((item: any) => ({
          name: String(item.dsNome || item.nome || "Produto"),
          quantity: Number(item.nrQuantidade || item.quantidade || 1),
          unitary_value: Number(item.preco || item.price || 0),
        })),
        volumes: [{
          width: Math.max(11, Math.ceil(totalFisico.largura)),
          height: Math.max(2, Math.ceil(totalFisico.altura)),
          length: Math.max(16, Math.ceil(totalFisico.comprimento)),
          weight: Math.max(0.1, totalFisico.peso),
        }],
        options: {
          insurance_value: totalFisico.valor,
          non_commercial: true,
          platform: "FestaEmTopo",
          note: String(p.financeiro?.metodo || "N/A"),
        },
      };

      // 4. Chamadas ao Melhor Envio
      try {
        const cartRes = await fetch(`${baseUrl}/api/v2/me/cart`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payloadCart),
        });

        const cartData = await cartRes.json().catch(() => ({}));

        if (!cartRes.ok) {
          throw new Error(cartData.message || JSON.stringify(cartData) || "Erro ao adicionar ao carrinho");
        }

        const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ orders: [cartData.id] }),
        });

        const checkoutData = await checkoutRes.json().catch(() => ({}));

        if (checkoutRes.ok && Array.isArray(checkoutData)) {
          await pedidoRef.update({
            etiquetaGerada: true,
            idEtiquetaMelhorEnvio: cartData.protocol,
            statusEtiqueta: "paga",
            dataGeracaoEtiqueta: new Date().toISOString(),
            dsNumRastreio: checkoutData[0]?.tracking || null,
          });
          results.push({ pedido: p.id, status: "sucesso" });
        } else {
          throw new Error(String(checkoutData.error || checkoutData.message || "Erro no checkout"));
        }
      } catch (err: any) {
        await pedidoRef.update({ etiquetaGerada: false, statusPagamento: "erro", erroPagamento: err.message });
        errors.push({ pedido: p.id, message: err.message });
      }
      
      await new Promise(r => setTimeout(r, 800));
    }

    return NextResponse.json({ success: true, results, errors });
  } catch (error: any) {
    console.error("Erro na rota de frete:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}