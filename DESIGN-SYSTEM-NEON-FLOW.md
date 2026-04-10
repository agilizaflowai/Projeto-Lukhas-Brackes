# DESIGN SYSTEM — NEON FLOW
## Agiliza Flow | CRM de Automação para Personal Trainer

---

## IDENTIDADE

**Conceito:** Dark mode com personalidade. Base azul marinho profundo, acentos em verde neon (#39ff8e) e magenta (#e455a0). Energia de app fitness moderno — como se Nike Training Club e Linear tivessem um filho.

**Brand voice:** Energético mas inteligente. Direto ao ponto.
- Empty states: "Zero leads frios. Bora fazer barulho no Instagram."
- Tooltips: ação-primeiro, sem floreio
- Botões: verbos de ação ("Aprovar", "Agendar", "Assumir")
- Erros: humanos ("Algo deu errado. Tenta de novo?")

---

## PALETA DE CORES

### Core
| Token | Uso | Light Mode | Dark Mode (padrão) |
|-------|-----|------------|-------------------|
| `--background` | Fundo da página | `oklch(0.97 0.005 270)` | `oklch(0.14 0.03 270)` |
| `--foreground` | Texto principal | `oklch(0.15 0.03 270)` | `oklch(0.93 0.01 270)` |
| `--card` | Cards, surfaces | `oklch(1.0 0 0)` | `oklch(0.18 0.03 270)` |
| `--card-foreground` | Texto nos cards | `oklch(0.15 0.03 270)` | `oklch(0.93 0.01 270)` |
| `--popover` | Modals, dropdowns | `oklch(1.0 0 0)` | `oklch(0.20 0.03 270)` |
| `--popover-foreground` | Texto popover | `oklch(0.15 0.03 270)` | `oklch(0.93 0.01 270)` |

### Brand
| Token | Uso | Light Mode | Dark Mode (padrão) |
|-------|-----|------------|-------------------|
| `--primary` | CTAs, ações, sucesso | `oklch(0.72 0.19 155)` | `oklch(0.82 0.22 155)` |
| `--primary-foreground` | Texto sobre primary | `oklch(0.14 0.03 270)` | `oklch(0.10 0.03 270)` |
| `--secondary` | Backgrounds secundários | `oklch(0.93 0.005 270)` | `oklch(0.22 0.03 270)` |
| `--secondary-foreground` | Texto secundário | `oklch(0.40 0.02 270)` | `oklch(0.78 0.01 270)` |
| `--accent` | Destaque secundário (magenta) | `oklch(0.60 0.20 340)` | `oklch(0.68 0.22 340)` |
| `--accent-foreground` | Texto sobre accent | `oklch(1.0 0 0)` | `oklch(1.0 0 0)` |

### UI
| Token | Uso | Light Mode | Dark Mode (padrão) |
|-------|-----|------------|-------------------|
| `--muted` | Áreas inativas | `oklch(0.94 0.005 270)` | `oklch(0.20 0.02 270)` |
| `--muted-foreground` | Texto muted | `oklch(0.50 0.02 270)` | `oklch(0.50 0.02 270)` |
| `--border` | Bordas padrão | `oklch(0.88 0.005 270)` | `oklch(0.25 0.03 270)` |
| `--input` | Bordas de input | `oklch(0.88 0.005 270)` | `oklch(0.28 0.03 270)` |
| `--ring` | Focus ring | `oklch(0.72 0.19 155)` | `oklch(0.82 0.22 155)` |

### Status
| Token | Uso | Light Mode | Dark Mode (padrão) |
|-------|-----|------------|-------------------|
| `--destructive` | Erro, delete, rejeitar | `oklch(0.55 0.22 25)` | `oklch(0.62 0.22 15)` |
| `--destructive-foreground` | Texto sobre destructive | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` |
| `--success` | Sucesso, aprovado, fechou | `oklch(0.72 0.19 155)` | `oklch(0.82 0.22 155)` |
| `--warning` | Pendente, atrasado | `oklch(0.80 0.16 90)` | `oklch(0.85 0.18 90)` |
| `--info` | Informativo | `oklch(0.70 0.12 230)` | `oklch(0.75 0.14 230)` |

### Sidebar
| Token | Light Mode | Dark Mode (padrão) |
|-------|------------|-------------------|
| `--sidebar-background` | `oklch(0.15 0.03 270)` | `oklch(0.10 0.03 270)` |
| `--sidebar-foreground` | `oklch(0.75 0.01 270)` | `oklch(0.78 0.01 270)` |
| `--sidebar-primary` | `oklch(0.72 0.19 155)` | `oklch(0.82 0.22 155)` |
| `--sidebar-primary-foreground` | `oklch(0.10 0.03 270)` | `oklch(0.10 0.03 270)` |
| `--sidebar-accent` | `oklch(0.20 0.03 270)` | `oklch(0.16 0.04 270)` |
| `--sidebar-accent-foreground` | `oklch(0.90 0.01 270)` | `oklch(0.90 0.01 270)` |
| `--sidebar-border` | `oklch(0.25 0.03 270)` | `oklch(0.20 0.03 270)` |

---

## CORES POR STAGE DO LEAD

| Stage | Background | Text | Border |
|-------|-----------|------|--------|
| `novo` | `oklch(0.25 0.06 230 / 0.3)` | `oklch(0.78 0.12 230)` | `oklch(0.50 0.12 230)` |
| `lead_frio` | `oklch(0.25 0.02 270 / 0.3)` | `oklch(0.65 0.02 270)` | `oklch(0.40 0.02 270)` |
| `rapport` | `oklch(0.25 0.08 300 / 0.3)` | `oklch(0.78 0.14 300)` | `oklch(0.55 0.14 300)` |
| `social_selling` | `oklch(0.25 0.08 270 / 0.3)` | `oklch(0.78 0.12 270)` | `oklch(0.55 0.12 270)` |
| `spin` | `oklch(0.25 0.10 60 / 0.3)` | `oklch(0.82 0.14 60)` | `oklch(0.60 0.14 60)` |
| `call_agendada` | `oklch(0.25 0.10 90 / 0.3)` | `oklch(0.85 0.16 90)` | `oklch(0.65 0.16 90)` |
| `fechado` | `oklch(0.25 0.12 155 / 0.3)` | `oklch(0.82 0.22 155)` | `oklch(0.60 0.19 155)` |
| `perdido` | `oklch(0.25 0.10 15 / 0.3)` | `oklch(0.75 0.18 15)` | `oklch(0.55 0.18 15)` |
| `follow_up` | `oklch(0.25 0.10 195 / 0.3)` | `oklch(0.78 0.14 195)` | `oklch(0.55 0.14 195)` |

## CORES POR STATUS DE MENSAGEM

| Status | Background | Text |
|--------|-----------|------|
| `pending` | `oklch(0.25 0.10 90 / 0.3)` | `oklch(0.85 0.18 90)` |
| `approved` | `oklch(0.25 0.12 155 / 0.3)` | `oklch(0.82 0.22 155)` |
| `sent` | `oklch(0.25 0.06 230 / 0.3)` | `oklch(0.78 0.12 230)` |
| `rejected` | `oklch(0.25 0.10 15 / 0.3)` | `oklch(0.75 0.18 15)` |

## CORES POR RESULTADO DE CALL

| Result | Background | Text |
|--------|-----------|------|
| `fechou` | `oklch(0.25 0.12 155 / 0.3)` | `oklch(0.82 0.22 155)` |
| `nao_fechou` | `oklch(0.25 0.10 15 / 0.3)` | `oklch(0.75 0.18 15)` |
| `reagendar` | `oklch(0.25 0.10 90 / 0.3)` | `oklch(0.85 0.18 90)` |
| `no_show` | `oklch(0.25 0.02 270 / 0.3)` | `oklch(0.65 0.02 270)` |

---

## TIPOGRAFIA

### Fontes
```
Display (h1, h2, hero): Outfit — Google Fonts
Body (p, ui, labels):    Hanken Grotesk — Google Fonts
Mono (dados, badges):    Space Mono — Google Fonts
```

### Escala Tipográfica
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| h1 | 28px / 1.75rem | 700 | 1.2 | -0.02em |
| h2 | 22px / 1.375rem | 600 | 1.25 | -0.015em |
| h3 | 17px / 1.0625rem | 600 | 1.3 | -0.01em |
| body | 14px / 0.875rem | 400 | 1.6 | 0 |
| body-sm | 13px / 0.8125rem | 400 | 1.5 | 0 |
| small | 12px / 0.75rem | 500 | 1.4 | 0.01em |
| caption | 11px / 0.6875rem | 500 | 1.3 | 0.02em |
| label | 11px / 0.6875rem | 600 | 1.0 | 0.05em |
| mono | 13px / 0.8125rem | 400 | 1.5 | 0.02em |

### Uso
- **Headings de página** (Dashboard, Pipeline, Leads): h1 Outfit Bold
- **Títulos de card/seção**: h3 Outfit SemiBold
- **Labels de métricas**: caption, uppercase, tracking wide
- **Números grandes (métricas)**: h1 Outfit Bold, cor primary ou accent
- **Texto de chat/body**: body Hanken Grotesk Regular
- **Dados em tabelas**: body-sm Hanken Grotesk + Space Mono para números
- **Badges/tags**: caption, Hanken Grotesk Medium

---

## ESPAÇAMENTO

### Sistema base: 4px
| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | 4px | Gaps internos mínimos |
| `--space-2` | 8px | Gap entre ícone e texto, padding de badges |
| `--space-3` | 12px | Gap de grid interno, padding de inputs |
| `--space-4` | 16px | Padding de cards, gap de grids |
| `--space-5` | 20px | Padding de seções internas |
| `--space-6` | 24px | Padding principal de página, gap entre seções |
| `--space-8` | 32px | Margem entre blocos grandes |
| `--space-10` | 40px | Margem de página em desktop |
| `--space-12` | 48px | Espaço entre seções de dashboard |
| `--space-16` | 64px | Padding de hero/empty states |

### Padrões fixos
| Componente | Padding | Gap interno |
|------------|---------|-------------|
| Card | 16px | — |
| MetricCard | 16px 20px | — |
| Modal/Dialog | 24px | 16px |
| Sidebar | 12px horizontal | 2px entre items |
| TopBar | 0 16px (h: 56px) | — |
| Input | 0 12px (h: 40px) | — |
| Button default | 0 16px (h: 40px) | 8px |
| Button sm | 0 12px (h: 32px) | 6px |
| Badge | 2px 10px | 4px |
| Tag | 4px 10px | 4px |
| Chat bubble | 12px 16px | — |
| Grid de cards | — | 12px gap |
| Grid de métricas | — | 12px gap |
| Grid de gráficos | — | 16px gap |

---

## BORDER RADIUS

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 4px | Badges, tags, sparklines |
| `--radius-md` | 6px | Buttons, inputs, selects |
| `--radius-lg` | 8px | Cards, chart boxes |
| `--radius-xl` | 12px | Modals, dialogs |
| `--radius-2xl` | 16px | Tooltips flutuantes |
| `--radius-full` | 9999px | Avatares, pills |

---

## SOMBRAS

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Cards em repouso |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards em hover |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.5)` | Modals, dialogs |
| `--shadow-glow-primary` | `0 0 20px oklch(0.82 0.22 155 / 0.25)` | Hover de CTA primary |
| `--shadow-glow-accent` | `0 0 20px oklch(0.68 0.22 340 / 0.20)` | Hover de accent/magenta |
| `--shadow-glow-warning` | `0 0 16px oklch(0.85 0.18 90 / 0.20)` | Badges de atenção |

---

## BORDAS

| Tipo | Valor |
|------|-------|
| Default | `1px solid var(--border)` |
| Emphasis | `1px solid var(--primary)` |
| Hover | `1px solid oklch(0.35 0.04 270)` |
| Focus | `2px solid var(--ring)` + `0 0 0 2px var(--ring) / 0.2` |
| Card glow | `1px solid` + pseudo-element gradient border |
| Sidebar border | `1px solid var(--sidebar-border)` |
| Stage left-border | `3px solid [stage-color]` em cards de lead |
| Chat pending | `2px solid var(--warning)` |

---

## MAPEAMENTO DE COMPONENTES + DECISÕES

### NAVIGATION

**Sidebar**
- Background: `--sidebar-background` (quase-preto azulado)
- Items: texto `--sidebar-foreground`, ícones lucide 18px
- Item ativo: bg `--sidebar-accent`, texto `--sidebar-primary` (neon verde)
- Item hover: bg `--sidebar-accent/50`
- Badges: pill com bg `--primary/15`, texto `--primary` (neon verde)
- Badge magenta (tarefas): bg `--accent/15`, texto `--accent`
- Logo: ícone 28px com gradient verde neon, border-radius 7px
- Micro-interação: transition 150ms ease em hover, translate-x de 2px no item ativo

**TopBar**
- Height: 56px
- Background: `--background` com backdrop-blur
- Border bottom: `--border`
- Avatar: 32px, border-radius full, com ring de 2px na cor do role (admin=neon, operator=cinza)
- Micro-interação: avatar pulsa sutilmente no hover (scale 1.05)

### DATA DISPLAY

**MetricCard**
- Background: `--card`
- Border: `--border`
- Border-radius: `--radius-lg` (8px)
- Padding: 16px 20px
- Label: caption, uppercase, `--muted-foreground`
- Número: h1 Outfit Bold, cor `--primary` (neon) ou `--accent` (magenta)
- Subtítulo: body-sm, `--muted-foreground`
- Sparkline: 7 barras de 4px width, border-radius 1px, cor `--primary/40`
- Glow: card principal (leads hoje) tem pseudo-element com gradient `--primary/8` → `--accent/8`
- Micro-interação: hover → shadow-md, border brightens

**KanbanBoard**
- Colunas: 280px width, flex horizontal com overflow-x scroll
- Column header: título h3 + contagem em pill
- Column drop zone: min-height 200px, bg `--muted/30`, border-radius `--radius-lg`
- Column active (isOver): bg `--primary/8`

**LeadCard (Kanban)**
- Background: `--card`
- Border: `--border`
- Border-left: 3px solid [stage-color]
- Border-radius: `--radius-lg`
- Padding: 12px
- Avatar: 36px, border-radius full
- Nome: body-sm, font-weight 500
- Username: caption, `--muted-foreground`
- Tags: badges com stage colors
- Timer: caption + ícone Clock 12px, `--muted-foreground`
- Follow-up atrasado: ícone AlertTriangle 16px, `--warning`
- Drag state: opacity 0.5, cursor grabbing
- Micro-interação: hover → shadow-md, translate-y -1px

**Chat Bubbles**
- Inbound (lead): bg `--muted`, border-radius 16px 16px 16px 4px, alinhado esquerda
- Outbound: bg `--primary/15`, border-radius 16px 16px 4px 16px, alinhado direita
- Outbound IA: badge "IA" em neon verde sobre o balão
- Outbound Lukhas: badge "Lukhas" em magenta
- Pending: border `2px solid var(--warning)`, bg `--warning/10`
- Timestamp: caption, `--muted-foreground`
- Micro-interação: mensagens novas entram com fade-in + translate-y 8px

**Timeline (Activity)**
- Vertical com linha de 1px `--border` à esquerda
- Cada item: ícone 32px em circle com bg da cor do tipo
- stage_changed: ícone ArrowRight, cor primary
- message_sent: ícone MessageSquare, cor info
- call_scheduled: ícone Calendar, cor warning
- human_takeover: ícone User, cor accent
- note_added: ícone StickyNote, cor muted
- Timestamp: caption, `--muted-foreground`

**Table (Leads list)**
- Background: `--card` no container
- Header: bg `--muted/50`, caption uppercase
- Rows: border-bottom `--border`, hover bg `--muted/30`
- Stage badges: cores do mapa de stages
- Micro-interação: row hover → bg transition 100ms

### FORMS

**Input**
- Height: 40px
- Background: `--background`
- Border: `--input`
- Border-radius: `--radius-md` (6px)
- Focus: border `--ring`, shadow `0 0 0 3px var(--ring) / 0.15`
- Placeholder: `--muted-foreground`

**Select**
- Mesmo estilo do Input
- Chevron customizado em `--muted-foreground`

**Textarea**
- Mesmo border/focus do Input
- Min-height: 80px

**Tag Input**
- Container com border do Input
- Tags dentro: pills com bg stage/secondary, botão X
- Input inline sem border
- Adicionar: Enter ou botão "+"

**Filters Bar**
- Flex horizontal com gap 12px
- Search input com ícone Search inline
- Selects com mesmo estilo

### FEEDBACK

**Loading Skeletons**
- Background: `--muted` com animate-pulse
- Border-radius: match do componente que substitui
- Shimmer: gradient animado `--muted` → `--muted/50` → `--muted`

**Empty States**
- Ícone: 48px, `--muted-foreground/50`
- Título: body, `--muted-foreground`
- Subtítulo: body-sm, `--muted-foreground/70`
- CTA (se houver): Button primary

**Toast Notifications**
- Position: bottom-right
- Background: `--card`
- Border: `--border`
- Border-left: 3px solid (success=primary, error=destructive, warning=warning)
- Auto-dismiss: 5s
- Entrada: slide-in + fade-in

**Confirm Dialogs**
- Overlay: bg `black/60` com backdrop-blur 4px
- Dialog: bg `--popover`, border `--border`, radius `--radius-xl`
- Padding: 24px
- Destructive: botão vermelho com glow warning no hover

### CHARTS

**Funnel (BarChart horizontal)**
- Barras: gradient `--primary` → `oklch(0.70 0.15 180)` (verde → ciano)
- Última barra (fechado): gradient `--accent` → `oklch(0.60 0.20 310)` (magenta → purple)
- Labels: caption, `--muted-foreground`
- Grid: linhas verticais `--border/50`

**Line Chart (semanal)**
- Linha: `--primary`, stroke-width 2
- Fill abaixo: gradient `--primary/30` → transparent
- Dots: `--primary`, radius 4, hover radius 6
- Grid: `--border/30`

**Score Indicator (calls 1-10)**
- Circular progress ring
- < 4: cor destructive
- 4-6: cor warning
- 7-10: cor primary (neon)
- Número grande no centro: h1 Outfit Bold

---

## MICRO-INTERAÇÕES

| Componente | Trigger | Animação |
|------------|---------|----------|
| Button | hover | scale(1.02), glow sutil, transition 150ms |
| Button primary | hover | shadow-glow-primary |
| Button | active | scale(0.98), transition 80ms |
| Card | hover | shadow-md, border brightens, translate-y -1px, transition 200ms |
| LeadCard (drag) | dragStart | opacity 0.5, scale(1.02) |
| Kanban column | isOver | bg primary/8, transition 150ms |
| Sidebar item | hover | bg sidebar-accent/50, translate-x 2px, transition 150ms |
| Chat message | appear | fade-in 200ms + translate-y 8px |
| Badge count | update | pulse scale animation 300ms |
| Toggle/switch | change | background transition 200ms ease |
| Modal | open | fade-in 150ms + scale from 0.95 |
| Modal overlay | open | fade-in 200ms |
| Toast | enter | slide-in from right 250ms ease-out |
| Toast | exit | fade-out 200ms |
| Skeleton | loading | shimmer sweep 1.5s infinite |
| Metric number | load | count-up animation 600ms ease-out |
| Sparkline bars | load | staggered scale-y from 0, 50ms delay each |

---

## PLANO DE IMPLEMENTAÇÃO

### Ordem de execução (arquivos a alterar/criar):

**Passo 1: Tokens base**
- `src/app/globals.css` — substituir todas as CSS variables com paleta Neon Flow
- `src/app/layout.tsx` — importar Google Fonts (Outfit, Hanken Grotesk, Space Mono)
- `tailwind.config.ts` — extend com fontFamily customizado (se necessário)

**Passo 2: Componentes UI base**
- `src/components/ui/button.tsx` — adicionar variant "glow" com hover neon
- `src/components/ui/badge.tsx` — adicionar variants de stage colors
- `src/components/ui/card.tsx` — adicionar variant "glow" com pseudo-element gradient
- `src/components/ui/input.tsx` — ajustar focus ring pra neon
- `src/components/ui/skeleton.tsx` — shimmer animation
- `src/lib/stage-colors.ts` — NOVO: mapa de cores por stage/status (constantes reutilizáveis)

**Passo 3: Sidebar + TopBar**
- `src/components/common/Sidebar.tsx` — aplicar tokens, transições, badge styles
- `src/components/common/TopBar.tsx` — aplicar tokens, avatar ring

**Passo 4: Dashboard**
- `src/components/dashboard/MetricCard.tsx` — sparkline, glow, tipografia Outfit
- `src/app/(dashboard)/page.tsx` — cores dos gráficos recharts

**Passo 5: Kanban**
- `src/components/kanban/LeadCard.tsx` — border-left stage color, hover effect
- `src/components/kanban/Column.tsx` — isOver glow
- `src/components/kanban/Board.tsx` — DragOverlay style

**Passo 6: Chat + Timeline**
- `src/app/(dashboard)/leads/[id]/page.tsx` — chat bubbles, timeline icons, pending highlight

**Passo 7: Modals + Forms**
- `src/components/ui/dialog.tsx` — backdrop-blur, entrada animada
- Todas as páginas com dialogs: ajustar destructive buttons

**Passo 8: Empty states + Loading**
- Criar componente `src/components/common/EmptyState.tsx`
- Aplicar em todas as páginas que têm estado vazio

**Passo 9: Micro-interações**
- Adicionar transitions em todos os componentes (CSS transitions, não JS)
- Chat: fade-in em novas mensagens
- Sparkline: staggered animation

**Passo 10: Responsivo final**
- Testar todas as telas em 375px, 768px, 1024px, 1440px
- Ajustar grids que quebram
- Sidebar: drawer em mobile com overlay

---

*Design System criado em 09/04/2026*
*Projeto: SaaS Lukhas Backes — Agiliza Flow — Neon Flow Theme*
