// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { clearAllStorage, STORAGE_KEYS, writeJSON } from "@/lib/storage";

class ROStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ROStub);

vi.mock("react-apexcharts", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", async () => {
  type RN = import("react").ReactNode;
  return {
    DropdownMenu: ({ children }: { children: RN }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: RN }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: RN }) => <div>{children}</div>,
    DropdownMenuGroup: ({ children }: { children: RN }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, ...rest }: { children: RN }) => (
      <div role="menuitem" {...(rest as object)}>{children}</div>
    ),
    DropdownMenuLabel: ({ children }: { children: RN }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuShortcut: ({ children }: { children: RN }) => <span>{children}</span>,
  };
});

import { useSettingsStore } from "@/stores/settings";
import { useFinanceStore } from "@/stores/finance";
import { useGoalsStore } from "@/stores/goals";
import { useMarketStore } from "@/stores/market";
import { useRunsStore } from "@/stores/runs";

import Dashboard from "@/pages/Dashboard";
import Header from "@/components/header";
import TitheSettings from "@/pages/TitheSettings";

function resetStores() {
  clearAllStorage();
  try {
    localStorage.clear();
  } catch {
    /* ignora */
  }
  useFinanceStore.setState({ transactionsList: [] } as never);
  useGoalsStore.setState({ goals: [], filteredGoals: [] } as never);
  useMarketStore.setState({ stockList: [] } as never);
  useRunsStore.setState({ runs: [] } as never);
  useSettingsStore.setState({ isEnableTitheCard: 1, isTitheMenuEnabled: 0 } as never);
}

function seedConfig(partial: Record<string, unknown>) {
  writeJSON(STORAGE_KEYS.config, partial);
  useSettingsStore.setState(partial as never);
}

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe("dízimo desabilitado — Dashboard sem coluna em branco", () => {
  it("com cartão de dízimo desativado usa 3 colunas e esconde card Dízimo", async () => {
    seedConfig({ isEnableTitheCard: 0 });
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Saldo")).toBeTruthy();
    });
    expect(screen.queryByText("Dízimo")).toBeNull();
    const grid = container.querySelector('[data-testid="hero-cards"]');
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain("md:grid-cols-3");
    expect(grid!.className).not.toContain("md:grid-cols-4");
  });

  it("com cartão de dízimo ativado usa 4 colunas e mostra card Dízimo", async () => {
    seedConfig({ isEnableTitheCard: 1 });
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Dízimo")).toBeTruthy();
    });
    const grid = container.querySelector('[data-testid="hero-cards"]');
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain("md:grid-cols-4");
  });
});

describe("dízimo desabilitado — dropdown sem link Dízimo", () => {
  it("esconde Dízimo do dropdown quando menu desabilitado", async () => {
    useSettingsStore.setState({ isTitheMenuEnabled: 0 } as never);
    render(
      <MemoryRouter>
        <Header title="Início" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Configurações")).toBeTruthy();
    });
    expect(screen.queryByTestId("menu-item-tithe")).toBeNull();
    expect(screen.queryByText("Dízimo")).toBeNull();
  });

  it("mostra Dízimo no dropdown quando menu habilitado", async () => {
    useSettingsStore.setState({ isTitheMenuEnabled: 1 } as never);
    render(
      <MemoryRouter>
        <Header title="Início" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("menu-item-tithe")).toBeTruthy();
    });
    expect(screen.getByText("Dízimo")).toBeTruthy();
  });
});

describe("dízimo desabilitado — /tithe redireciona para /settings", () => {
  function LocationProbe() {
    const loc = useLocation();
    return <span data-testid="loc">{loc.pathname}</span>;
  }

  it("vai para /settings quando menu desabilitado", async () => {
    seedConfig({ isTitheMenuEnabled: 0 });
    render(
      <MemoryRouter initialEntries={["/tithe"]}>
        <Routes>
          <Route path="/tithe" element={<TitheSettings />} />
          <Route path="/settings" element={<div>Página Configurações</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toBe("/settings");
    });
    expect(screen.getByText("Página Configurações")).toBeTruthy();
  });

  it("permanece em /tithe quando menu habilitado", async () => {
    seedConfig({ isTitheMenuEnabled: 1 });
    render(
      <MemoryRouter initialEntries={["/tithe"]}>
        <Routes>
          <Route path="/tithe" element={<TitheSettings />} />
          <Route path="/settings" element={<div>Página Configurações</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Base de cálculo/).length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("loc").textContent).toBe("/tithe");
  });
});
