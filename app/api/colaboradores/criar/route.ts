// app/api/colaboradores/criar/route.ts
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        databaseURL: `https://${process.env.FIREBASE_ADMIN_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const lojistaId = body.lojistaId;
        const email = body.email || body.emailFinal;
        const senhaBruta = body.senha || body.nrSenhaColaborador || "123456";
        const nome = body.nome || body.dsNomeColaborador;
        const cargo = body.cargo || body.dsCargoColaborador;
        const telefone = body.telefone || body.dsTelefoneColaborador;
        const pin = body.pin || body.nrPinColaborador;
        const permissoes = body.permissoes;

        if (!lojistaId || !email || !nome) {
            return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
        }

        const senhaValida = senhaBruta.length < 6 ? senhaBruta.padEnd(6, '0') : senhaBruta;

        const adminAuth = getAuth();
        const adminDb = getFirestore();

        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email,
                password: senhaValida,
                displayName: nome,
            });
        } catch (authError: any) {
            console.error("Erro no Auth Admin:", authError);
            return NextResponse.json({ error: "Erro ao criar conta de Auth: " + authError.message }, { status: 400 });
        }

        const uid = userRecord.uid;

        // 🌟 Salvando na coleção "usuarios" com flags booleanas padronizadas
        await adminDb.collection("usuarios").doc(uid).set({
            email,
            dsEmailColaborador: email,
            dsLojaId: lojistaId,
            lojaId: lojistaId,
            role: "colaborador",
            isTipoContaColaborador: true,  // ✅ Flag exata de colaborador
            isTipoContaLogista: false,     // ✅ Garante que não é lojista
            isTipoContaMaster: false,      // ✅ Garante que não é master
            dsNomeColaborador: nome,
            dsCargoColaborador: cargo || "Caixa / Operador",
            permissoes: permissoes || {},
            createdAt: new Date(),
            tsCriacaoColaborador: new Date()
        });

        const colabData = {
            dsUidAuth: uid,
            uid,
            dsNomeColaborador: nome,
            nome,
            dsEmailColaborador: email,
            email,
            dsCargoColaborador: cargo || "Caixa / Operador",
            cargo,
            dsTelefoneColaborador: telefone || "",
            telefone: telefone || "",
            nrPinColaborador: pin || "0000",
            pin: pin || "0000",
            permissoes: permissoes || { dash: false, produtos: false, pedidos: true, pdv: true, estoque: false, config: false },
            dsLojaId: lojistaId,
            createdAt: new Date(),
            tsCriacaoColaborador: new Date()
        };

        console.log("🔥 SALVANDO NA SUBCOLEÇÃO DA LOJA:", lojistaId, "-> Colaborador ID:", uid);

        await adminDb.collection("lojistas").doc(lojistaId).collection("colaboradores").doc(uid).set(colabData);

        return NextResponse.json({ success: true, id: uid, uid }, { status: 200 });
    } catch (error: any) {
        console.error("Erro geral na API:", error);
        return NextResponse.json({ error: error.message || "Erro interno no servidor." }, { status: 500 });
    }
}