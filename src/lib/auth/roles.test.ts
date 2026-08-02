import { describe, it, expect } from "vitest";
import { can, visibleModules } from "./roles";

describe("permissões por perfil", () => {
  it("admin pode tudo", () => {
    expect(can("admin", "financeiro", "delete")).toBe(true);
    expect(can("admin", "configuracoes", "manage")).toBe(true);
    expect(visibleModules("admin").length).toBeGreaterThan(15);
  });

  it("operador só escreve lançamentos, não gerencia financeiro", () => {
    expect(can("operador", "lancamento", "write")).toBe(true);
    expect(can("operador", "financeiro", "read")).toBe(false);
    expect(can("operador", "configuracoes", "read")).toBe(false);
  });

  it("comercial acessa clientes e vendas, não sanidade", () => {
    expect(can("comercial", "vendas", "write")).toBe(true);
    expect(can("comercial", "clientes", "write")).toBe(true);
    expect(can("comercial", "sanidade", "read")).toBe(false);
  });

  it("veterinario acessa sanidade e pesagens, não vendas", () => {
    expect(can("veterinario", "sanidade", "write")).toBe(true);
    expect(can("veterinario", "pesagens", "write")).toBe(true);
    expect(can("veterinario", "vendas", "read")).toBe(false);
  });

  it("consulta é somente leitura", () => {
    expect(can("consulta", "producao", "read")).toBe(true);
    expect(can("consulta", "producao", "write")).toBe(false);
    expect(can("consulta", "financeiro", "delete")).toBe(false);
  });
});
