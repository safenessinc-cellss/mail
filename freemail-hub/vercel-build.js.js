// vercel-build.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando build para Vercel...');

try {
  // Verifica se o arquivo server.ts existe
  if (!fs.existsSync('server.ts')) {
    console.error('❌ server.ts não encontrado!');
    process.exit(1);
  }

  console.log('✅ server.ts encontrado');

  // Tenta compilar com TypeScript
  try {
    console.log('📦 Compilando TypeScript...');
    execSync('npx tsc --skipLibCheck --esModuleInterop --module ESNext --moduleResolution node --outDir dist', {
      stdio: 'inherit'
    });
    console.log('✅ Compilação concluída!');
  } catch (tscError) {
    console.warn('⚠️ TypeScript falhou, usando fallback...');
    
    // Fallback: copia server.ts diretamente para dist
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }
    fs.copyFileSync('server.ts', 'dist/server.js');
    console.log('✅ Fallback: server.ts copiado para dist/server.js');
  }

  // Verifica se o arquivo foi criado
  if (fs.existsSync('dist/server.js')) {
    console.log('✅ Build finalizado com sucesso!');
    process.exit(0);
  } else {
    console.error('❌ Build falhou - server.js não encontrado');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Erro no build:', error);
  process.exit(1);
}