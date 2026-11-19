export type InterestId =
  | "esportes"
  | "games"
  | "rpg"
  | "leitura"
  | "musica"
  | "artes"
  | "cultura-geek"
  | "programacao"
  | "gastronomia";

export type SegmentId = "participante" | "organizador" | "parceiro";

export type PlanId = "explorador" | "organizador-plus" | "parceiro-local";

export type PainPointId =
  | "encontrar-grupos-locais"
  | "timidez-integracao"
  | "bagunca-whatsapp"
  | "grupos-inativos"
  | "confirmacao-presenca"
  | "falta-companhia";

export interface InterestCategory {
  id: InterestId;
  label: string;
  shortLabel: string;
  description: string;
  activeTribesCount: number;
}

export interface TribePreview {
  id: string;
  name: string;
  category: InterestId;
  categoryLabel: string;
  format: "Presencial" | "Híbrido" | "Online";
  neighborhood: string;
  city: string;
  beginnerFriendly: boolean;
  membersCount: number;
  weeklyFrequency: string;
  tagline: string;
  nextEvent: {
    title: string;
    dateLabel: string;
    locationLabel: string;
    confirmedCount: number;
    maxSpots: number;
    costLabel: string;
    pinnedNotes: string[];
  };
  recentMessages: {
    author: string;
    role: string;
    text: string;
    time: string;
  }[];
  organizerName: string;
  partnerVenue?: string;
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "esportes",
    label: "Esportes & Ar Livre",
    shortLabel: "Esportes",
    description: "Corrida leve, futebol, vôlei de areia, ciclismo e trilhas de fim de semana.",
    activeTribesCount: 18,
  },
  {
    id: "rpg",
    label: "RPG de Mesa & Board Games",
    shortLabel: "RPG & Board Games",
    description: "Campanhas one-shot, noites de jogos de tabuleiro e mesas abertas para iniciantes.",
    activeTribesCount: 14,
  },
  {
    id: "games",
    label: "Vídeo-games & E-sports",
    shortLabel: "Games & Co-op",
    description: "Squads fixos sem toxicidade, campeonatos amadores e noites co-op.",
    activeTribesCount: 21,
  },
  {
    id: "leitura",
    label: "Leitura & Clubes do Livro",
    shortLabel: "Leitura",
    description: "Leituras conjuntas mensais com bate-papo presencial em cafés e livrarias.",
    activeTribesCount: 11,
  },
  {
    id: "musica",
    label: "Música & Jam Sessions",
    shortLabel: "Música",
    description: "Rodas acústicas, prática em grupo, produção musical e companhia para shows.",
    activeTribesCount: 9,
  },
  {
    id: "cultura-geek",
    label: "Animes, Séries & Cinema",
    shortLabel: "Cinema & Anime",
    description: "Sessões comentadas, estreias no cinema e clubes de animação japonesa.",
    activeTribesCount: 15,
  },
  {
    id: "programacao",
    label: "Programação, IA & Tech",
    shortLabel: "Programação",
    description: "Encontros de estudo, hackathons universitários, projetos open-source e networking.",
    activeTribesCount: 13,
  },
  {
    id: "artes",
    label: "Artes, Foto & Criação",
    shortLabel: "Artes & Criação",
    description: "Urban sketching, saídas fotográficas, escrita criativa e oficinas colaborativas.",
    activeTribesCount: 8,
  },
  {
    id: "gastronomia",
    label: "Cafés & Rolês Culturais",
    shortLabel: "Cafés & Cultura",
    description: "Roteiros de cafés especiais, exposições gratuitas e feiras gastronômicas.",
    activeTribesCount: 12,
  },
];

export const PAIN_POINTS: { id: PainPointId; label: string }[] = [
  {
    id: "encontrar-grupos-locais",
    label: "Não sei onde encontrar grupos com os mesmos interesses perto de mim",
  },
  {
    id: "falta-companhia",
    label: "Quero fazer um hobby ou ir a um evento, mas acabo indo só ou desistindo",
  },
  {
    id: "timidez-integracao",
    label: "Sinto dificuldade ou timidez para entrar em grupos onde todos já se conhecem",
  },
  {
    id: "bagunca-whatsapp",
    label: "Datas, locais e avisos importantes somem no meio de mensagens no WhatsApp/Discord",
  },
  {
    id: "confirmacao-presenca",
    label: "Organizo encontros, mas ninguém confirma direito quem realmente vai aparecer",
  },
  {
    id: "grupos-inativos",
    label: "Os grupos começam animados, mas morrem depois de poucas semanas",
  },
];

export const SAMPLE_TRIBES: TribePreview[] = [
  {
    id: "dados-e-dragoes-pampulha",
    name: "Dados & Dragões Pampulha",
    category: "rpg",
    categoryLabel: "RPG & Board Games",
    format: "Presencial",
    neighborhood: "Pampulha / UFMG",
    city: "Belo Horizonte",
    beginnerFriendly: true,
    membersCount: 34,
    weeklyFrequency: "Quinzenal · Sábados",
    tagline:
      "Mesas one-shot de D&D 5e, Tormenta20 e jogos de tabuleiro modernos. Fichas prontas para quem nunca jogou.",
    nextEvent: {
      title: "Tarde de One-Shots + Catan & Ticket to Ride",
      dateLabel: "Sábado, 14h30 às 18h30",
      locationLabel: "Ludoteca Tabuleiro Café · Pampulha",
      confirmedCount: 14,
      maxSpots: 18,
      costLabel: "R$ 15 consumação no local",
      pinnedNotes: [
        "3 mesas simultâneas (2 iniciantes, 1 veteranos) — escolha sua mesa ao confirmar.",
        "Não precisa levar dados nem livro; os mestres levam kit completo.",
        "Recepção para novatos 15 min antes para quebrar o gelo.",
      ],
    },
    recentMessages: [
      {
        author: "Marina S.",
        role: "Mestra & Organizadora",
        text: "Subi as 4 opções de personagens prontos no card do evento! Quem for primeira vez pode escolher na hora.",
        time: "há 18 min",
      },
      {
        author: "Lucas T.",
        role: "Novo membro",
        text: "Primeira vez indo num grupo de RPG presencial, valeu demais pela recepção!",
        time: "há 7 min",
      },
    ],
    organizerName: "Marina Soares",
    partnerVenue: "Tabuleiro Café (Parceiro Verificado)",
  },
  {
    id: "pace-leve-lagoa",
    name: "Pace Leve & Café da Manhã",
    category: "esportes",
    categoryLabel: "Esportes & Ar Livre",
    format: "Presencial",
    neighborhood: "Orla da Pampulha / Savassi",
    city: "Belo Horizonte",
    beginnerFriendly: true,
    membersCount: 62,
    weeklyFrequency: "Semanal · Domingos",
    tagline:
      "Treino social de 3 km e 5 km sem pressão de performance, seguido de café em grupo para conversar de verdade.",
    nextEvent: {
      title: "Giro de Domingo 5km (pelotão caminhada + trote leve)",
      dateLabel: "Domingo, 07h30 às 09h15",
      locationLabel: "Praça da Liberdade · Coreto Central",
      confirmedCount: 23,
      maxSpots: 30,
      costLabel: "Gratuito",
      pinnedNotes: [
        "Dois ritmos separados: Caminhada/Iniciante (pace 7:30+) e Trote Conversado (pace 6:15).",
        "Guarda-volumes colaborativo com o organizador no ponto de encontro.",
        "Pós-treino opcional na padaria da esquina com 10% off para membros da tribo.",
      ],
    },
    recentMessages: [
      {
        author: "Rafael M.",
        role: "Organizador",
        text: "Previsão de sol ameno domingo! Lista de presença fechando com 7 vagas restantes.",
        time: "há 42 min",
      },
      {
        author: "Beatriz C.",
        role: "Membro há 2 meses",
        text: "Confirmada no pelotão iniciante! Levo minha colega da faculdade dessa vez.",
        time: "há 15 min",
      },
    ],
    organizerName: "Rafael Moreira",
    partnerVenue: " Torra & Pão Artesanal",
  },
  {
    id: "clube-pagina-virada",
    name: "Clube Página Virada",
    category: "leitura",
    categoryLabel: "Leitura & Clubes do Livro",
    format: "Híbrido",
    neighborhood: "Funcionários / Online",
    city: "Belo Horizonte",
    beginnerFriendly: true,
    membersCount: 41,
    weeklyFrequency: "Mensal + Sprints semanais",
    tagline:
      "Lemos um livro curto por mês com metas semanais leves e encontro presencial sem spoiler para quem ainda está no meio.",
    nextEvent: {
      title: "Roda de Conversa: Ficção Científica Latino-Americana",
      dateLabel: "Quinta-feira, 19h00 às 21h00",
      locationLabel: "Livraria & Café Jardim · Savassi (+ sala de vídeo)",
      confirmedCount: 16,
      maxSpots: 20,
      costLabel: "Gratuito",
      pinnedNotes: [
        "Enquete de escolha do livro do próximo mês já aberta no card fixo.",
        "Primeiros 45 min sem spoilers dos capítulos finais.",
        "Link de transmissão disponível automaticamente para quem marcou participação online.",
      ],
    },
    recentMessages: [
      {
        author: "Camila R.",
        role: "Mediadora",
        text: "Mesa reservada no fundo da livraria! Quem chegar cedo procura a plaquinha laranja da Tribes.",
        time: "há 1h",
      },
    ],
    organizerName: "Camila Rocha",
    partnerVenue: "Livraria Jardim",
  },
  {
    id: "squad-coop-noite",
    name: "Squad Co-op Sem Tilt",
    category: "games",
    categoryLabel: "Vídeo-games & E-sports",
    format: "Online",
    neighborhood: "Servidor Regional BR",
    city: "Online / Brasil",
    beginnerFriendly: true,
    membersCount: 78,
    weeklyFrequency: "Terças e Quintas · 20h30",
    tagline:
      "Para quem trabalha ou estuda o dia todo e só quer fechar squad fixo em jogos cooperativos sem gritaria nem toxicidade.",
    nextEvent: {
      title: "Noite Co-op: Helldivers 2, Valorant Swift & Baldur's Gate 3",
      dateLabel: "Quinta-feira, 20h30 às 23h00",
      locationLabel: "Salas de Voz Integradas · Online",
      confirmedCount: 15,
      maxSpots: 20,
      costLabel: "Gratuito",
      pinnedNotes: [
        "Divisão automática em 4 squads de 4–5 pessoas conforme jogo escolhido no RSVP.",
        "Regra de ouro: zero rage com quem está aprendendo mecânica nova.",
      ],
    },
    recentMessages: [
      {
        author: "Pedro H.",
        role: "Organizador",
        text: "Squad 2 fechou 4/4 pra Helldivers! Ainda tem 2 vagas no squad de jogos indie co-op.",
        time: "há 25 min",
      },
    ],
    organizerName: "Pedro Henrique",
  },
  {
    id: "code-coffee-ufmg",
    name: "Code, IA & Café",
    category: "programacao",
    categoryLabel: "Programação, IA & Tech",
    format: "Presencial",
    neighborhood: "Pampulha / Santo Agostinho",
    city: "Belo Horizonte",
    beginnerFriendly: true,
    membersCount: 49,
    weeklyFrequency: "Quinzenal · Sábados",
    tagline:
      "Manhãs práticas para tirar projetos pessoais do papel, estudar arquitetura/IA em par e conhecer gente de produto e engenharia.",
    nextEvent: {
      title: "Build Session #08: Mostre o que você está construindo em 5 min",
      dateLabel: "Sábado, 09h30 às 12h00",
      locationLabel: "Coworking Aberto · Santo Agostinho",
      confirmedCount: 19,
      maxSpots: 24,
      costLabel: "Gratuito",
      pinnedNotes: [
        "Wi-Fi e tomadas garantidas para todos os confirmados.",
        "90 min de mão na massa silenciosa/em dupla + 30 min de demos rápidas.",
      ],
    },
    recentMessages: [
      {
        author: "Helena V.",
        role: "Organizadora",
        text: "Qualquer stack ou nível vale — semana passada tivemos desde calouro de SI até dev sênior.",
        time: "há 50 min",
      },
    ],
    organizerName: "Helena Vasconcelos",
  },
  {
    id: "cineclube-tela-aberta",
    name: "Cineclube & Anime Tela Aberta",
    category: "cultura-geek",
    categoryLabel: "Animes, Séries & Cinema",
    format: "Presencial",
    neighborhood: "Centro / Santa Tereza",
    city: "Belo Horizonte",
    beginnerFriendly: true,
    membersCount: 53,
    weeklyFrequency: "Quinzenal · Sextas",
    tagline:
      "Sessões conjuntas em cinemas de rua, mostras gratuitas e bate-papo pós-filme na mesa do bar.",
    nextEvent: {
      title: "Sessão Comentada: Clássicos Studio Ghibli + Roda no Café",
      dateLabel: "Sexta-feira, 19h00 às 22h00",
      locationLabel: "Cine Santa Tereza · Praça Duque de Caxias",
      confirmedCount: 21,
      maxSpots: 25,
      costLabel: "Entrada gratuita (sujeito à retirada)",
      pinnedNotes: [
        "Nos encontramos na fila às 18h30 com crachá discreto da tribo.",
        "Pós-sessão a duas quadras para conversar sobre trilha sonora e direção de arte.",
      ],
    },
    recentMessages: [
      {
        author: "Thiago A.",
        role: "Organizador",
        text: "Já garanti aviso da bilheteria: ingressos liberam 30 min antes. Ponto de encontro marcado no mapa!",
        time: "há 33 min",
      },
    ],
    organizerName: "Thiago Andrade",
  },
];

export const COMPARISON_ROWS = [
  {
    criteria: "Descoberta de pessoas na sua região",
    currentTools: "Restrito a quem já tem o link de convite (WhatsApp/Discord) ou perfis fechados.",
    tribes: "Busca aberta por interesses, bairro/campus e formato (presencial, híbrido ou online).",
  },
  {
    criteria: "Integração de novos membros (timidez)",
    currentTools: "Você entra mudo num grupo antigo cheio de piadas internas e sai sem interagir.",
    tribes: "Selo 'Aberto para iniciantes', grupos em escala humana e recepção guiada no 1º encontro.",
  },
  {
    criteria: "Organização de data, local e horário",
    currentTools: "Informações somem no meio de 300 mensagens e figurinhas paralelas.",
    tribes: "Card de encontro fixado no topo com mapa, horário, custo, enquete e avisos essenciais.",
  },
  {
    criteria: "Lista real de quem vai participar (RSVP)",
    currentTools: "Listas copiadas e coladas manualmente que ninguém atualiza quando desiste.",
    tribes: "Confirmação em 1 clique com limite de vagas, fila de espera automática e lembrete.",
  },
  {
    criteria: "Foco e bem-estar digital",
    currentTools: "Mistura mensagens de chefe, família e feed infinito que deixa sensação de isolamento.",
    tribes: "Espaço exclusivo para seus hobbies, sem feed viciante — feito para tirar você da tela.",
  },
];

export const PRICING_PLANS: {
  id: PlanId;
  name: string;
  audience: string;
  price: string;
  period: string;
  description: string;
  highlighted?: boolean;
  badge?: string;
  ctaLabel: string;
  segmentDefault: SegmentId;
  features: string[];
}[] = [
  {
    id: "explorador",
    name: "Membro Explorador",
    audience: "Para quem busca sua tribo",
    price: "R$ 0",
    period: "para sempre",
    description:
      "Encontre comunidades alinhadas aos seus hobbies, confirme presença em encontros e crie grupos abertos.",
    ctaLabel: "Entrar grátis na lista",
    segmentDefault: "participante",
    features: [
      "Descoberta ilimitada de tribos por interesse e região",
      "Confirmação de presença (RSVP) e agenda unificada",
      "Filtro de tribos com selo 'Aberto para iniciantes'",
      "Criação de até 2 tribos abertas (até 50 membros)",
      "Chat organizado por encontro, sem anúncios intrusivos",
    ],
  },
  {
    id: "organizador-plus",
    name: "Tribes Organizador Pro",
    audience: "Para líderes de comunidades e clubes",
    price: "R$ 19,90",
    period: "/mês no lançamento",
    description:
      "Ferramentas completas para manter sua comunidade ativa toda semana sem estresse operacional.",
    highlighted: true,
    badge: "Mais procurado por líderes",
    ctaLabel: "Testar 3 meses grátis no beta",
    segmentDefault: "organizador",
    features: [
      "Tribos e membros ilimitados com subgrupos por nível",
      "Eventos recorrentes automáticos e fila de espera inteligente",
      "Divisão transparente de custos (quadra, materiais, ingressos)",
      "Check-in rápido nos encontros e histórico de assiduidade",
      "Impulsionamento local para atrair novos membros do nicho",
    ],
  },
  {
    id: "parceiro-local",
    name: "Point Parceiro Verificado",
    audience: "Para cafés, ludotecas, arenas e livrarias",
    price: "R$ 89",
    period: "/mês por espaço",
    description:
      "Receba tribos recorrentes no seu estabelecimento e transforme horários ociosos em comunidade fiel.",
    badge: "B2B Local",
    ctaLabel: "Cadastrar meu espaço parceiro",
    segmentDefault: "parceiro",
    features: [
      "Selo 'Point Oficial Tribes' na busca de locais para eventos",
      "Oferta de benefícios/cupons exclusivos para grupos confirmados",
      "Reserva simplificada de mesas/quadras para organizadores",
      "Destaque segmentado por interesse num raio de até 10 km",
      "Relatório mensal de encontros realizados e público atraído",
    ],
  },
];

export const FAQ_ITEMS = [
  {
    question: "Qual a diferença entre a Tribes e grupos de WhatsApp, Discord ou Meetup?",
    answer:
      "No WhatsApp e no Discord, você só entra se já conhecer alguém com o link, e os detalhes de data, horário e lista de presença se perdem no meio das conversas. Já plataformas antigas de eventos focam apenas em palestras corporativas avulsas. A Tribes une descoberta local por afinidade com ferramentas nativas de organização recorrente (card fixo de encontro, RSVP com fila de espera e integração acolhedora para iniciantes).",
  },
  {
    question: "Sou tímido(a) ou nunca participei de um grupo assim. Vou me sentir deslocado(a)?",
    answer:
      "Essa foi uma das principais dores que mapeamos na nossa pesquisa! Por isso, as tribos contam com o selo 'Aberto para iniciantes', limite saudável de vagas por encontro para evitar multidões impessoais e um ritual de boas-vindas nos primeiros 15 minutos conduzido pelo organizador.",
  },
  {
    question: "Como funciona a segurança em encontros presenciais?",
    answer:
      "Encontros presenciais abertos acontecem preferencialmente em espaços públicos ou Points Parceiros Verificados (cafés, livrarias, centros esportivos, campi universitários). Todos os perfis passam por verificação, organizadores têm reputação avaliada pelos membros após cada encontro e há ferramentas claras de moderação.",
  },
  {
    question: "A Tribes é gratuita para participar?",
    answer:
      "Sim! Descobrir tribos, entrar em comunidades, conversar e confirmar presença em encontros é 100% gratuito. Nosso modelo de negócios se sustenta com recursos avançados opcionais para grandes organizadores (Tribes Pro) e parcerias com estabelecimentos locais que recebem os encontros.",
  },
  {
    question: "Quando o aplicativo será liberado e por que entrar na lista de espera agora?",
    answer:
      "Estamos lançando o MVP por ondas em Belo Horizonte (começando pelo eixo Pampulha/UFMG, Savassi e Centro) e em comunidades online selecionadas. Quem entra na lista agora garante acesso prioritário às primeiras tribos e, no caso de organizadores e parceiros, 3 meses gratuitos dos recursos Pro.",
  },
];
