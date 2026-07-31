import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Força a rota a ser tratada como dinâmica no runtime
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { lojistaId, orders } = body;

    if (!lojistaId || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json(
        { error: "Lojista não encontrado." },
        { status: 404 },
      );
    }

    const dadosLoja = lojistaSnap.data() || {};
    const token =
      dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio;

    if (!token) {
      return NextResponse.json(
        { error: "Token do Melhor Envio não configurado para este lojista." },
        { status: 400 },
      );
    }

    const baseUrl = dadosLoja.melhorEnvioSandbox
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";

    const results: any[] = [];
    const errors: any[] = [];

    for (const p of orders) {
      const itens = Array.isArray(p.itens) ? p.itens : [];
      const itensFisicos = itens.filter(
        (item: any) => item.precisaFrete !== false,
      );

      if (itensFisicos.length === 0) continue;

      const totalFisico = itensFisicos.reduce(
        (acc: any, item: any) => {
          const qty = Number(item.qty || item.quantidade || 1);
          return {
            peso: acc.peso + Number(item.peso || item.weight || 0.3) * qty,
            largura: Math.max(
              acc.largura,
              Number(item.largura || item.width || 15),
            ),
            altura: Math.max(
              acc.altura,
              Number(item.altura || item.height || 10),
            ),
            comprimento: Math.max(
              acc.comprimento,
              Number(item.comprimento || item.length || 15),
            ),
            valor: acc.valor + Number(item.preco || item.price || 0) * qty,
          };
        },
        { peso: 0, largura: 0, altura: 0, comprimento: 0, valor: 0 },
      );

      const serviceId = Number(
        p.Cotacao?.dsTransportadoraIdCotado ||
        p.logistica?.dsTransportadoraId ||
        p.financeiro?.dsTransportadoraId ||
        p.freteSelecionado?.id ||
        0,
      );

      const pedidoRef = db
        .collection("lojistas")
        .doc(lojistaId)
        .collection("pedidos")
        .doc(String(p.id));

      const payloadCart = {
        service: serviceId,
        from: {
          name: String(
            dadosLoja?.dadosLoja?.dsNomeLoja || dadosLoja.nomeLoja || "Loja",
          ).substring(0, 60),
          phone: String(
            dadosLoja?.dadosLoja?.nrWhatssapLoja ||
              dadosLoja.whatsapp ||
              "0000000000",
          ).replace(/\D/g, ""),
          email: String(dadosLoja.email || "contato@loja.com"),
          document: String(
            dadosLoja?.dadosLoja?.nrCnpjCpfLoja || dadosLoja.cnpj || "",
          ).replace(/\D/g, ""),
          address: String(
            dadosLoja?.dadosLoja?.dsRuaLoja ||
              dadosLoja.ruaOrigem ||
              "Endereço",
          ),
          number: String(
            dadosLoja?.dadosLoja?.nrNumeroLoja ||
              dadosLoja.numeroOrigem ||
              "S/N",
          ),
          district: String(
            dadosLoja?.dadosLoja?.dsBairroLoja || dadosLoja.bairroOrigem || "",
          ),
          city: String(
            dadosLoja?.dadosLoja?.dsCidadeLoja || dadosLoja.cidadeOrigem || "",
          ),
          state_abbr: String(
            dadosLoja?.dadosLoja?.dsUfLoja || dadosLoja.ufOrigem || "SP",
          )
            .toUpperCase()
            .substring(0, 2),
          postal_code: String(
            dadosLoja?.dsCepLoja ||
              dadosLoja?.dadosLoja?.dsCepLoja ||
              dadosLoja.cepOrigem ||
              "",
          ).replace(/\D/g, ""),
        },
        to: {
          name: String(
            p.cliente?.nmNomeCliente || p.cliente?.nome || "Cliente",
          ).substring(0, 60),
          phone: String(
            p.cliente?.dsTelefoneCliente || p.cliente?.telefone || "0000000000",
          ).replace(/\D/g, ""),
          email: String(
            p.cliente?.dsEmailCliente ||
              p.cliente?.email ||
              "cliente@email.com",
          ),
          document: String(
            p.cliente?.dsCpfCliente || p.cliente?.cpf || "",
          ).replace(/\D/g, ""),
          address: String(
            p.endereco?.dsRuaCliente ||
              p.endereco?.dsRua ||
              p.endereco?.rua ||
              "",
          ),
          number: String(
            p.endereco?.dsNumeroCliente || p.endereco?.numero || "S/N",
          ),
          complement: String(
            p.endereco?.dsComplementoCliente || p.endereco?.complemento || "",
          ),
          district: String(
            p.endereco?.dsBairroCliente || p.endereco?.bairro || "",
          ),
          city: String(p.endereco?.dsCidadeCliente || p.endereco?.cidade || ""),
          state_abbr: String(p.endereco?.dsUfCliente || p.endereco?.uf || "SP")
            .toUpperCase()
            .substring(0, 2),
          postal_code: String(
            p.endereco?.dsCepCliente || p.endereco?.cep || "",
          ).replace(/\D/g, ""),
        },
        products: itens.map((item: any) => ({
          name: String(item.dsNome || item.nome || "Produto").substring(0, 40),
          quantity: Number(item.nrQuantidade || item.quantidade || 1),
          unitary_value: Number(item.preco || item.price || 0),
        })),
        volumes: [
          {
            width: Math.max(11, Math.ceil(totalFisico.largura)),
            height: Math.max(2, Math.ceil(totalFisico.altura)),
            length: Math.max(16, Math.ceil(totalFisico.comprimento)),
            weight: Math.max(0.1, totalFisico.peso),
          },
        ],
        options: {
          insurance_value: totalFisico.valor,
          non_commercial: true,
          platform: "FestaEmTopo",
          note: String(p.financeiro?.metodo || "N/A"),
        },
      };

      try {
        // 1. Adiciona ao carrinho do Melhor Envio
        const cartRes = await fetch(`${baseUrl}/api/v2/me/cart`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payloadCart),
        });

        const cartData = await cartRes.json().catch(() => ({}));

        if (!cartRes.ok) {
          const detailedMsg =
            cartData.message ||
            JSON.stringify(cartData.errors) ||
            JSON.stringify(cartData);
          throw new Error(`Erro ao adicionar ao carrinho: ${detailedMsg}`);
        }

        const cartItemId = cartData.id || cartData.data?.id;
        if (!cartItemId) {
          throw new Error(
            "Carrinho do Melhor Envio não retornou o ID do item.",
          );
        }

        // CAPTURA CORRETA: Pega o protocolo oficial e o ID real retornados pela API do Melhor Envio
        const protocoloOficial =
          cartData.protocol || cartData.data?.protocol || `ORD-${cartItemId}`;
        const etiquetaRealId = cartData.id || cartData.data?.id || cartItemId;

        const idEtiquetaVal = String(etiquetaRealId);
        const codigoEnvioVal = String(protocoloOficial); // <--- Vai salvar exatamente "ORD-202607140051971" igual ao painel

        // 2. Tenta a geração/emissão da etiqueta (`/shipment/generate`)
        const generateRes = await fetch(
          `${baseUrl}/api/v2/me/shipment/generate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ orders: [cartItemId] }),
          },
        );

        const generateData = await generateRes.json().catch(() => ({}));
        if (!generateRes.ok) {
          throw new Error(
            generateData.message ||
              JSON.stringify(generateData.errors) ||
              "Erro ao gerar etiqueta",
          );
        }

        // 3. Tenta o Checkout (`/shipment/checkout`)
        let checkoutSucesso = false;
        let checkoutErrorMsg = "";

        const checkoutRes = await fetch(
          `${baseUrl}/api/v2/me/shipment/checkout`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ orders: [cartItemId] }),
          },
        );

        const checkoutData = await checkoutRes.json().catch(() => ({}));

        if (!checkoutRes.ok) {
          checkoutErrorMsg =
            checkoutData.message ||
            JSON.stringify(checkoutData.errors) ||
            "Erro ao realizar checkout";
        } else {
          checkoutSucesso = true;
        }

        // Aguarda 1s
        await new Promise((r) => setTimeout(r, 1000));

        // Dados finais que serão salvos no Firebase
        // O Melhor Envio retorna o preço exato do frete na resposta do carrinho (cartData.price) ou do checkout
        const precoRealFrete = Number(
          cartData?.price || cartData?.data?.price || checkoutData?.price || 0
        );

        // Se por acaso o preço vier 0, usa o valor que estava salvo na cotação para nunca puxar o total do produto
        const valorFinalCalculado = precoRealFrete > 0 
          ? precoRealFrete 
          : Number(p.Cotacao?.vlFreteCotado || p.financeiro?.vlFrete || 0);

        // Dados finais que serão salvos no Firebase
        const dadosEtiquetaParaSalvar = {
          pedido: String(p.id),
          IdEtiqueta: String(cartItemId),
          codigoEnvio: String(protocoloOficial),
          dsNumRastreio: checkoutData?.tracking || null,
          urlEtiqueta: checkoutData?.url || null,
          statusEtiqueta: checkoutSucesso ? "gerada" : "pendente_saldo",
          servicoVinculado: String(serviceId),
          valorCobrado: valorFinalCalculado, // <-- Agora puxa o valor real exato da etiqueta (ex: 32.60)
          dataGeracaoEtiqueta: new Date().toISOString(),
        };

        // EXIBE NO TERMINAL OS DADOS EXATOS QUE ESTÃO INDO PARA O FIREBASE
        console.log(
          `📦 [DADOS DA ETIQUETA - PEDIDO ${p.id}]:`,
          JSON.stringify(dadosEtiquetaParaSalvar, null, 2),
        );

        // Salva no Firebase
        await pedidoRef.update({
          etiquetaGerada: true,
          statusEtiqueta: checkoutSucesso ? "gerada" : "pendente_saldo",
          dsNumRastreio: checkoutData?.tracking || "",
          Etiqueta: dadosEtiquetaParaSalvar,
        });

        if (!checkoutSucesso) {
          errors.push({ pedido: p.id, message: checkoutErrorMsg });
        } else {
          results.push({ pedido: p.id, status: "sucesso" });
        }
      } catch (err: any) {
        errors.push({ pedido: p.id, message: err.message });
      }

      await new Promise((r) => setTimeout(r, 800));
    }

    if (errors.length > 0) {
      console.error(
        "🚨 DETALHES DOS ERROS NO MELHOR ENVIO:",
        JSON.stringify(errors, null, 2),
      );
    }

    return NextResponse.json({ success: true, results, errors });
  } catch (error: any) {
    console.error("Erro na rota de checkout em lote do Melhor Envio:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
