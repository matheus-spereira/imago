'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createChatSession(agentId: string, consultantId: string) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const chatSession = await prisma.chatSession.create({
    data: {
      agentId,
      consultantId,
      studentId: session.user.role === 'STUDENT' ? session.user.id : undefined,
      title: "Nova Conversa",
    }
  });

  // O redirect DEVE ser a última coisa e fora de blocos try-catch se possível,
  // mas aqui está ok pois não estamos capturando erros.
  redirect(`/chat/${chatSession.id}`);
}