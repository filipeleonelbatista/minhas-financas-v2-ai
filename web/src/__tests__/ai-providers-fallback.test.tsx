// @vitest-environment jsdom
// Regressão: "após configurar um provedor, a ordem do fallback não funciona"
// O provedor salvo deve entrar sozinho na ordem de fallback.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AIProviders from "../pages/AIProviders";
import { getFallbackOrder, _clearAiProvidersMemory } from "@/utils/aiProviders";
import { _clearSecureMemory } from "@/utils/secureStore";

beforeEach(async () => {
  await _clearAiProvidersMemory();
  await _clearSecureMemory();
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderProviders(initial = "/ai-providers") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/ai-providers" element={<AIProviders />} />
        <Route path="/ia" element={<div>chat ia</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ai providers: fallback após configurar", () => {
  it("provedor salvo entra na ordem de fallback e aparece na lista", async () => {
    renderProviders();

    fireEvent.click(screen.getByTestId("btn-add-provider"));
    fireEvent.change(screen.getByTestId("input-key-modal"), { target: { value: "sk-test" } });
    fireEvent.click(screen.getByTestId("btn-search-models"));
    await waitFor(() => expect(screen.getByTestId("btn-save-provider")).toBeTruthy());
    fireEvent.click(screen.getByTestId("btn-save-provider"));

    await waitFor(() => expect(screen.getByTestId("fallback-item-openai")).toBeTruthy());
    expect(await getFallbackOrder()).toEqual(["openai"]);
  });

  it("botão abre o chat da IA", async () => {
    renderProviders();
    fireEvent.click(screen.getByTestId("btn-go-chat"));
    await waitFor(() => expect(screen.getByText("chat ia")).toBeTruthy());
  });
});
