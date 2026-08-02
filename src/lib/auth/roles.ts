/**
 * Perfis de acesso e permissões (itens 7 e 30 da especificação).
 *
 * As permissões são verificadas no servidor (server actions / route handlers)
 * e replicadas na interface apenas para esconder o que o usuário não pode usar.
 * A camada final de segurança é a Row Level Security no banco.
 */

export const ROLES = [
  "admin",
  "gerente",
  "operador",
  "veterinario",
  "comercial",
  "consulta",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  operador: "Operador",
  veterinario: "Veterinário / Técnico",
  comercial: "Comercial",
  consulta: "Consulta (somente leitura)",
};

/**
 * Módulos protegidos da aplicação. Cada item de menu mapeia para um módulo.
 */
export const MODULES = [
  "overview",
  "producao",
  "lancamento",
  "lotes",
  "aviarios",
  "ovos",
  "racao",
  "estoque",
  "pesagens",
  "sanidade",
  "ambiente",
  "clientes",
  "vendas",
  "esterco",
  "financeiro",
  "relatorios",
  "tarefas",
  "alertas",
  "configuracoes",
] as const;

export type Module = (typeof MODULES)[number];

/** Ações possíveis sobre um módulo. */
export type Action = "read" | "write" | "delete" | "manage";

/**
 * Matriz de permissões por perfil.
 * - "*" concede todas as ações em todos os módulos (admin).
 * - Um módulo ausente = sem acesso.
 * - Cada módulo lista as ações permitidas.
 */
type ModulePerms = Partial<Record<Module, Action[]>>;

const READ_ALL: ModulePerms = MODULES.reduce((acc, m) => {
  acc[m] = ["read"];
  return acc;
}, {} as ModulePerms);

export const PERMISSIONS: Record<Role, "*" | ModulePerms> = {
  admin: "*",
  gerente: {
    overview: ["read"],
    producao: ["read", "write"],
    lancamento: ["read", "write"],
    lotes: ["read", "write"],
    aviarios: ["read", "write"],
    ovos: ["read", "write"],
    racao: ["read", "write"],
    estoque: ["read", "write"],
    pesagens: ["read", "write"],
    sanidade: ["read", "write"],
    ambiente: ["read", "write"],
    relatorios: ["read"],
    tarefas: ["read", "write"],
    alertas: ["read", "write"],
    esterco: ["read", "write"],
    financeiro: ["read", "write"], // financeiro operacional
    configuracoes: ["read"],
  },
  operador: {
    overview: ["read"],
    producao: ["read"],
    lancamento: ["read", "write"], // lançamentos dos galpões autorizados
    lotes: ["read"],
    aviarios: ["read"],
    ovos: ["read", "write"],
    racao: ["read", "write"],
    ambiente: ["read", "write"],
    esterco: ["read", "write"], // registra a produção/retirada de esterco
    tarefas: ["read", "write"],
    alertas: ["read"],
  },
  veterinario: {
    overview: ["read"],
    producao: ["read"],
    lotes: ["read"],
    aviarios: ["read"],
    pesagens: ["read", "write"],
    sanidade: ["read", "write"],
    ambiente: ["read"],
    relatorios: ["read"],
    tarefas: ["read", "write"],
    alertas: ["read"],
  },
  comercial: {
    overview: ["read"],
    ovos: ["read"],
    estoque: ["read"],
    clientes: ["read", "write"],
    vendas: ["read", "write"],
    esterco: ["read", "write"], // venda de esterco é receita comercial
    financeiro: ["read"], // contas a receber
    relatorios: ["read"],
    tarefas: ["read"],
    alertas: ["read"],
  },
  consulta: READ_ALL,
};

/** Verifica se um perfil tem uma ação em um módulo. */
export function can(role: Role, module: Module, action: Action = "read"): boolean {
  const perms = PERMISSIONS[role];
  if (perms === "*") return true;
  const actions = perms[module];
  if (!actions) return false;
  if (actions.includes("manage")) return true;
  // "write" implica "read"; "delete" implica "read".
  if (action === "read") return actions.length > 0;
  return actions.includes(action);
}

/** Módulos visíveis (com pelo menos leitura) para um perfil. */
export function visibleModules(role: Role): Module[] {
  return MODULES.filter((m) => can(role, m, "read"));
}
