// update-pass.js
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const email = 'matheusmsp2014@gmail.com'; // altere se precisar
    const plain = 'senha123'; // nova senha desejada
    const hash = await bcrypt.hash(plain, 10);
    console.log('generated hash:', hash, 'len', hash.length);

    const user = await prisma.user.update({
      where: { email },
      data: { password: hash },
    });
    console.log('DB updated user id:', user.id);

    // verify locally
    const ok = await bcrypt.compare(plain, hash);
    console.log('local compare result:', ok);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();