export type Group = 'essential' | 'lifestyle' | 'future' | 'debts';
export const GROUPS: Record<Group, string> = { essential: 'Essencial', lifestyle: 'Estilo de vida', future: 'Futuro', debts: 'Dívidas' };
export interface Tx { id: string; name: string; group: Group | 'income'; date: string; value: number }
export interface Goal { id: string; title: string; saved: number; total: number }
export interface Debt { id: string; creditor: string; balance: number; interestRate: number; minPayment: number; dueDay: number }
export type Prefs = Record<Group, number>;
export const PRESETS: Record<string, Prefs> = {
  '50·30·20': { essential: 50, lifestyle: 30, future: 20, debts: 0 },
  '50·25·10·15 (com dívidas)': { essential: 50, lifestyle: 25, future: 10, debts: 15 },
};

export const uid = () => Math.random().toString(36).slice(2, 10);
export const brl = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Função ÚNICA de conversão: "8,5", "8.5" e "1.234,56" viram número correto.
export function parseMoney(s: string): number {
  let t = s.trim().replace(/[^\d.,-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

export function groupSpend(txs: Tx[]): Record<Group, number> {
  const r: Record<Group, number> = { essential: 0, lifestyle: 0, future: 0, debts: 0 };
  txs.forEach(t => { if (t.group !== 'income' && t.value < 0) r[t.group] += -t.value; });
  return r;
}

export function payoffPlan(debts: Debt[], strategy: 'balance' | 'rate', extra: number) {
  const ds = debts.map(d => ({ ...d }));
  const order = [...ds].sort((a, b) => strategy === 'balance' ? a.balance - b.balance : b.interestRate - a.interestRate).map(d => d.id);
  const pool = ds.reduce((s, d) => s + d.minPayment, 0) + extra;
  let months = 0, interest = 0;
  while (ds.some(d => d.balance > 0.005) && months < 600) {
    months++;
    ds.forEach(d => { const i = d.balance * d.interestRate / 100; d.balance += i; interest += i; });
    let left = pool;
    ds.forEach(d => { const p = Math.min(d.balance, d.minPayment, left); d.balance -= p; left -= p; });
    for (const id of order) { const d = ds.find(x => x.id === id)!; const p = Math.min(d.balance, left); d.balance -= p; left -= p; }
  }
  return { order: order.map(id => debts.find(d => d.id === id)!.creditor), months, interest, ok: months < 600 };
}

export const LESSONS = [
  { id: 'l1', title: 'Para onde vai meu dinheiro?', q: 'Qual o primeiro passo para organizar o orçamento?', opts: ['Registrar entradas e saídas', 'Pegar um empréstimo', 'Cortar todo o lazer'], ok: 0 },
  { id: 'l2', title: 'Reserva de emergência', q: 'Para que serve a reserva de emergência?', opts: ['Comprar por impulso', 'Imprevistos sem entrar em dívida', 'Pagar o cartão todo mês'], ok: 1 },
  { id: 'l3', title: 'Dívidas: por onde começar?', q: 'No método "maior juro primeiro", qual dívida é paga primeiro?', opts: ['A de menor saldo', 'A de maior taxa de juros', 'A mais antiga'], ok: 1 },
];
