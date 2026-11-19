import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// carimbo de versão (data e hora da montagem do site), mostrado no menu para conferir se a versão nova chegou
const versao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __VERSAO__: JSON.stringify(versao) },
})
