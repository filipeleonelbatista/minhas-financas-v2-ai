/** Dízimo — espelha `app/src/repositories/tithe.ts` (textos JFA + validação). */

export type TitheScripture = {
  reference: string;
  text: string;
  reflection: string;
  translation: string;
};

export const TITHE_SCRIPTURES: TitheScripture[] = [
  {
    reference: "Malaquias 3:8-10",
    text: "Roubará o homem a Deus? Todavia vós me roubais e dizeis: Em que te roubamos? Nos dízimos e nas ofertas. Com maldição sois amaldiçoados, porque me roubais, vós, toda a nação. Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa, e depois fazei prova de mim, diz o Senhor dos Exércitos, se eu não vos abrir as janelas do céu e não derramar sobre vós uma bênção tal, que dela vos advenha a maior abastança.",
    reflection: "Deus convida à fidelidade e promete bênçãos abundantes a quem honra a casa dEle.",
    translation: "João Ferreira de Almeida - JFA",
  },
  {
    reference: "Marcos 12:41-44 (Viúva)",
    text: "E Jesus, assentado defronte da arca do tesouro, observava a maneira como a multidão lançava o dinheiro na arca; e muitos ricos depositavam muito. Vindo, porém, uma pobre viúva, deitou duas pequenas moedas, que valiam meio centavo. E, chamando os seus discípulos, disse-lhes: Em verdade vos digo que esta pobre viúva deitou mais do que todos os que deitaram na arca do tesouro; porque todos ali deitaram do que lhes sobejava, mas esta, da sua pobreza, deitou tudo o que tinha, todo o seu sustento.",
    reflection: "Deus valoriza o coração generoso, não o valor. Entrega total agrada ao Senhor.",
    translation: "João Ferreira de Almeida - JFA",
  },
  {
    reference: "2 Coríntios 9:6-7",
    text: "E digo isto: Que o que semeia pouco pouco também ceifará; e o que semeia em abundância em abundância também ceifará. Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria.",
    reflection: "Deus ama quem dá com alegria. Dízimo é adoração, não obrigação pesada.",
    translation: "João Ferreira de Almeida - JFA",
  },
  {
    reference: "Provérbios 3:9-10",
    text: "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda; e se encherão os teus celeiros abundantemente, e trasbordarão de mosto os teus lagares.",
    reflection: "Priorizar a Deus nas finanças abre portas para provisão sobrenatural.",
    translation: "João Ferreira de Almeida - JFA",
  },
  {
    reference: "Lucas 6:38",
    text: "Dai, e ser-vos-á dado; boa medida, recalcada, sacudida e transbordando vos deitarão no vosso regaço; porque com a mesma medida com que medirdes também vos medirão de novo.",
    reflection: "A generosidade retorna multiplicada. Quem dá com fé colhe com abundância.",
    translation: "João Ferreira de Almeida - JFA",
  },
];

/** 1–100, passo 0,5, padrão 10 — igual ao app. */
export function validateTithePercent(input: unknown): number {
  if (input === undefined || input === null) return 10;
  const num = Number(input);
  if (!Number.isFinite(num)) return 10;
  const clamped = Math.min(100, Math.max(1, num));
  return Math.round(clamped * 2) / 2;
}
