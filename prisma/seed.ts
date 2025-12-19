// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Cria o Usuário de Teste (se não existir)
  const user = await prisma.user.upsert({
    where: { email: 'teste@imago.ai' },
    update: {},
    create: {
      email: 'teste@imago.ai',
      name: 'João Maria',
      password: 'senha-falsa-hash', // Em prod use hash real
    },
  })

  // 2. Cria o Perfil de Consultor vinculado a ele
  await prisma.consultantProfile.upsert({
    where: { userId: user.id }, // Busca pelo ID do usuário criado acima
    update: {},
    create: {
      id: 'teste-fixo-123', // O ID MÁGICO QUE SEU FRONTEND USA
      userId: user.id,
      slug: 'teste-dev',
      name: 'Consultor de Teste',
      systemPrompt: 'Você é um assistente útil e didático.',
      plan: 'PRO'
    },
  })

  console.log('🌱 Banco de dados semeado com sucesso!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })