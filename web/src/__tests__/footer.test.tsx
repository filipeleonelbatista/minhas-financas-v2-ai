// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../components/footer";

describe("footer links legais", () => {
  it("expõe Termos, Privacidade e APK com URLs do gh-pages", () => {
    render(<Footer />);
    const base =
      "https://filipeleonelbatista.github.io/minhas-financas-v2-ai";
    expect(
      screen.getByRole("link", { name: "Termos de Uso" }).getAttribute("href")
    ).toBe(`${base}/termos.html`);
    expect(
      screen.getByRole("link", { name: "Privacidade" }).getAttribute("href")
    ).toBe(`${base}/privacidade.html`);
    expect(
      screen.getByRole("link", { name: "Baixar APK Android" }).getAttribute(
        "href"
      )
    ).toBe(
      "https://expo.dev/artifacts/eas/TZqom4Tv-08itde1qFPitkLQYaV2-kWLxOkX87niyHU.apk"
    );
    expect(
      screen.getByRole("link", { name: "Filipe Batista" }).getAttribute("href")
    ).toBe("https://filipeleonelbatista.github.io/");
  });
});
