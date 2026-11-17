# Tribes — Landing Page MVP (TP4 · Empreendimentos em Informática)

Landing Page de validação (Smoke Test + Protótipo Interativo) para a rede social **Tribes**, focada em conectar pessoas a partir de interesses em comum e descomplicar a organização de encontros presenciais, híbridos e online.

## O que esta entrega contempla

1. **Proposta de Valor e Diagnóstico do Problema**: contraste direto entre o isolamento/ruído das redes atuais e grupos de mensagens (WhatsApp, Discord, Instagram) e a organização por comunidades em escala humana da Tribes.
2. **Mockup Interativo no Hero**: demonstração funcional do *Card de Encontro Fixado* com confirmação de presença (RSVP) em 1 clique separada do chat.
3. **Explorador Interativo de Tribos (`#explorar`)**: filtragem por hobby/interesse, formato (`Presencial`, `Híbrido`, `Online`), busca textual e selo **Aberto para iniciantes**, com modal detalhado de cada tribo.
4. **Segmentos do Modelo de Negócios (`#segmentos` e `#planos`)**:
   - **Membros Exploradores (B2C Gratuito)**
   - **Organizadores de Comunidades (Freemium / Tribes Organizador Pro)**
   - **Points & Espaços Parceiros Verificados (B2B Local — cafés, ludotecas, arenas, livrarias)**
5. **Captura de Lista de Espera (`#lista-espera`)**: coleta perfil, cidade/região, interesses e principal dor enfrentada, recomendando tribos compatíveis imediatamente após o envio.
6. **Painel de Métricas de Validação do MVP (`/metricas`)**: acompanhamento de sessões visitantes, interações no protótipo, cliques em planos, taxa de conversão, demanda por interesse/segmento e exportação CSV de cadastros locais de demonstração.

## Tecnologias

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Lucide Icons

## Como executar localmente

```bash
npm install
npm run dev -- --port 4317
```

Acesse `http://localhost:4317` para visualizar a Landing Page e `http://localhost:4317/metricas` para acompanhar o painel de métricas do MVP.
