import { financeRepo, calcTithePure } from './finance';
import { tithePayments } from '../db/schema';
import { eq } from 'drizzle-orm';

let _db:any=null; let _attempted=false;
function getDb():any{
  if(_attempted) return _db;
  _attempted=true;
  try{ const mod=require('../db'); _db=mod.db??null; }catch{ _db=null; }
  return _db;
}

let memory: any[]=[];

function genId(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`; }

export const TITHE_SCRIPTURES = [
  {
    reference: 'Malaquias 3:8-10',
    text: 'Roubará o homem a Deus? Todavia vós me roubais e dizeis: Em que te roubamos? Nos dízimos e nas ofertas. Com maldição sois amaldiçoados, porque me roubais, vós, toda a nação. Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa, e depois fazei prova de mim, diz o Senhor dos Exércitos, se eu não vos abrir as janelas do céu e não derramar sobre vós uma bênção tal, que dela vos advenha a maior abastança.',
    reflection: 'Deus convida à fidelidade e promete bênçãos abundantes a quem honra a casa dEle.',
    translation: 'João Ferreira de Almeida - JFA',
  },
  {
    reference: 'Marcos 12:41-44 (Viúva)',
    text: 'E Jesus, assentado defronte da arca do tesouro, observava a maneira como a multidão lançava o dinheiro na arca; e muitos ricos depositavam muito. Vindo, porém, uma pobre viúva, deitou duas pequenas moedas, que valiam meio centavo. E, chamando os seus discípulos, disse-lhes: Em verdade vos digo que esta pobre viúva deitou mais do que todos os que deitaram na arca do tesouro; porque todos ali deitaram do que lhes sobejava, mas esta, da sua pobreza, deitou tudo o que tinha, todo o seu sustento.',
    reflection: 'Deus valoriza o coração generoso, não o valor. Entrega total agrada ao Senhor.',
    translation: 'João Ferreira de Almeida - JFA',
  },
  {
    reference: '2 Coríntios 9:6-7',
    text: 'E digo isto: Que o que semeia pouco pouco também ceifará; e o que semeia em abundância em abundância também ceifará. Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria.',
    reflection: 'Deus ama quem dá com alegria. Dízimo é adoração, não obrigação pesada.',
    translation: 'João Ferreira de Almeida - JFA',
  },
  {
    reference: 'Provérbios 3:9-10',
    text: 'Honra ao Senhor com os teus bens e com as primícias de toda a tua renda; e se encherão os teus celeiros abundantemente, e trasbordarão de mosto os teus lagares.',
    reflection: 'Priorizar a Deus nas finanças abre portas para provisão sobrenatural.',
    translation: 'João Ferreira de Almeida - JFA',
  },
  {
    reference: 'Lucas 6:38',
    text: 'Dai, e ser-vos-á dado; boa medida, recalcada, sacudida e transbordando vos deitarão no vosso regaço; porque com a mesma medida com que medirdes também vos medirão de novo.',
    reflection: 'A generosidade retorna multiplicada. Quem dá com fé colhe com abundância.',
    translation: 'João Ferreira de Almeida - JFA',
  },
];

export function validateTithePercent(input: unknown): number {
  if (input === undefined || input === null) return 10;
  const num = Number(input);
  if (!isFinite(num) || isNaN(num)) return 10;
  let clamped = num;
  if (clamped < 1) clamped = 1;
  if (clamped > 100) clamped = 100;
  // step 0.5 -> round to nearest 0.5
  const rounded = Math.round(clamped * 2) / 2;
  return rounded;
}

export function getMonthlyTithePreview(list: any[], percentInput: unknown, categories: string[]): { amount: number; warning: string | null; formatted: string } {
  const percent = validateTithePercent(percentInput);
  if (!categories || categories.length === 0) {
    return {
      amount: 0,
      warning: 'Selecione ao menos um Ganho',
      formatted: (0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }),
    };
  }
  const amount = calcTithePure(list as any, { percent, categories });
  return {
    amount,
    warning: null,
    formatted: amount.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }),
  };
}

export const titheRepo = {
  async getAll(): Promise<any[]> {
    const db=getDb();
    if(db){
      try{ const rows=await db.select().from(tithePayments); return rows; }catch{}
    }
    return [...memory];
  },
  async addPayment(dto: { amount:number; date?:number; month?:number; year?:number }): Promise<any>{
    const nowDate = dto.date ?? Date.now();
    const d = new Date(nowDate);
    const row={
      id: genId(),
      amount: Number(dto.amount),
      date: Number(nowDate),
      month: dto.month ?? (d.getMonth()+1),
      year: dto.year ?? d.getFullYear(),
      createdAt: Date.now(),
    };
    const db=getDb();
    if(db){
      try{ await db.insert(tithePayments).values(row); return row; }catch{}
    }
    memory.push(row);
    return row;
  },
  async markAsPaid(params: { percent?:number; categories?:string[]; month?:number; year?:number; filteredList?:any[] }): Promise<{ finance:any; payment:any; amount:number }>{
    const percent = validateTithePercent(params.percent ?? 10);
    const categories = params.categories ?? [];
    // if empty base, amount 0 but still create? For test, not empty
    let amount = 0;
    if (params.filteredList) {
      amount = calcTithePure(params.filteredList as any, { percent, categories });
    } else {
      // fetch all finances and calc
      const all = await financeRepo.getAll();
      amount = calcTithePure(all as any, { percent, categories });
    }
    // clamp negative already in calcTithePure
    const now = new Date();
    const month = params.month ?? (now.getMonth()+1);
    const year = params.year ?? now.getFullYear();
    const monthLabel = `${String(month).padStart(2,'0')}/${year}`;
    // create finance transaction saida Dízimo - Mês
    const finance = await financeRepo.add({
      description: `Dízimo - ${monthLabel}`,
      amount,
      category: 'Outros',
      date: Date.now(),
      paymentDate: Date.now(),
      paymentStatus: 1,
      isEnabled: 1,
      isFavorited: 0,
    });
    const payment = await this.addPayment({ amount, month, year, date: Date.now() });
    return { finance, payment, amount };
  },
  async clearMemory(){
    memory=[];
    const db=getDb();
    if(db){ try{ await db.delete(tithePayments); }catch{} }
  },
  // test helpers
  _memory(){ return memory; },
};
