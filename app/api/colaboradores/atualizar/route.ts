// app/api/colaboradores/atualizar/route.ts
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
        const colaboradorId = body.colaboradorId; 
        const uid = body.uid || colaboradorId; 
        
        const nome = body.nome || body.dsNomeColaborador;
        const cargo = body.cargo || body.dsCargoColaborador;
        const telefone = body.telefone || body.dsTelefoneColaborador;
        const pin = body.pin || body.nrPinColaborador;
        const novaSenha = body.novaSenha;
        const permissoes = body.permissoes;

        if (!lojistaId || !colaboradorId) {
            return NextResponse.json({ error: "IDs obrigatórios não informados." }, { status: 400 });
        }

        const adminAuth = getAuth();
        const adminDb = getFirestore();

        // 1. Atualiza a senha no Authentication se fornecida
        if (novaSenha && novaSenha.trim().length > 0) {
            if (novaSenha.trim().length < 6) {
                return NextResponse.json({ error: "A nova senha deve ter no mínimo 6 caracteres." }, { status: 400 });
            }
            try {
                await adminAuth.updateUser(uid, {
                    password: novaSenha.trim(),
                    ...(nome && { displayName: nome })
                });
            } catch (authError: any) {
                console.error("Erro ao atualizar senha no Auth:", authError);
                return NextResponse.json({ error: "Erro ao atualizar senha: " + authError.message }, { status: 400 });
            }
        } else if (nome) {
            try {
                await adminAuth.updateUser(uid, { displayName: nome });
            } catch (e) {
                console.error("Erro ao atualizar displayName no Auth:", e);
            }
        }

        // 2. Monta o objeto com os dados atualizados para o Firestore
        const dadosAtualizados: any = {};
        if (nome !== undefined) {
            dadosAtualizados.dsNomeColaborador = nome;
            dadosAtualizados.nome = nome;
        }
        if (cargo !== undefined) {
            dadosAtualizados.dsCargoColaborador = cargo;
            dadosAtualizados.cargo = cargo;
        }
        if (telefone !== undefined) {
            dadosAtualizados.dsTelefoneColaborador = telefone;
            dadosAtualizados.telefone = telefone;
        }
        if (pin !== undefined) {
            dadosAtualizados.nrPinColaborador = pin;
            dadosAtualizados.pin = pin;
        }
        if (permissoes !== undefined) {
            dadosAtualizados.permissoes = permissoes;
        }

        // 3. Atualiza na subcoleção do lojista
        const colabRef = adminDb.collection("lojistas").doc(lojistaId).collection("colaboradores").doc(colaboradorId);
        await colabRef.set(dadosAtualizados, { merge: true });

        // 4. Atualiza na coleção global "usuarios"
        const usuarioRef = adminDb.collection("usuarios").doc(uid);
        const usuarioSnap = await usuarioRef.get();
        if (usuarioSnap.exists) {
            await usuarioRef.set({
                ...(nome !== undefined && { dsNomeColaborador: nome }),
                ...(cargo !== undefined && { dsCargoColaborador: cargo, role: "colaborador" }),
                ...(permissoes !== undefined && { permissoes })
            }, { merge: true });
        }

        return NextResponse.json({ success: true, message: "Colaborador atualizado com sucesso." }, { status: 200 });
    } catch (error: any) {
        console.error("Erro geral na API de atualização:", error);
        return NextResponse.json({ error: error.message || "Erro interno no servidor." }, { status: 500 });
    }
}