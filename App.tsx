import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { House, Target, CreditCard, BookOpen, User } from 'lucide-react-native';
import { usePersistent } from './src/storage';
import { Tx, Goal, Debt, Group, GROUPS, PRESETS, Prefs, brl, parseMoney, uid, groupSpend, payoffPlan, LESSONS } from './src/domain';

const C = { bg: '#fff5f6', card: '#fff', main: '#c2577a', dark: '#4a2433', soft: '#f3d5dd' };
const TABS = ['Início', 'Metas', 'Dívidas', 'Aprender', 'Perfil'] as const;
const ICON: Record<string, any> = { Início: House, Metas: Target, Dívidas: CreditCard, Aprender: BookOpen, Perfil: User };

const Card = ({ children }: any) => <View style={s.card}>{children}</View>;
const H = ({ t }: { t: string }) => <Text style={s.h}>{t}</Text>;
const Btn = ({ t, onPress, alt }: any) => (
  <Pressable onPress={onPress} style={[s.btn, alt && s.btnAlt]}><Text style={[s.btnT, alt && { color: C.main }]}>{t}</Text></Pressable>
);
const Inp = (p: any) => <TextInput placeholderTextColor="#b08a95" style={s.inp} {...p} />;
const Bar = ({ pct, color = C.main }: { pct: number; color?: string }) => (
  <View style={s.barBg}><View style={[s.barFg, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }]} /></View>
);

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Início');
  const [txs, setTxs] = usePersistent<Tx[]>('aleny:txs', []);
  const [goals, setGoals] = usePersistent<Goal[]>('aleny:goals', []);
  const [debts, setDebts] = usePersistent<Debt[]>('aleny:debts', []);
  const [prefs, setPrefs] = usePersistent<Prefs>('aleny:prefs', PRESETS['50·30·20']);
  const [salary, setSalary] = usePersistent<number>('aleny:salary', 0);
  const [progress, setProgress] = usePersistent<Record<string, number>>('aleny:lessons', {});

  return (
    <SafeAreaView style={s.root}>
      <Text style={s.logo}>Aleny</Text>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {tab === 'Início' && <Home {...{ txs, setTxs, prefs, salary }} />}
        {tab === 'Metas' && <Goals {...{ goals, setGoals }} />}
        {tab === 'Dívidas' && <Debts {...{ debts, setDebts }} />}
        {tab === 'Perfil' && <Profile {...{ salary, setSalary, prefs, setPrefs }} />}
        {tab === 'Aprender' && <Learn {...{ progress, setProgress }} />}
      </ScrollView>
      <View style={s.nav}>
        {TABS.map(x => (
          <Pressable key={x} onPress={() => setTab(x)} style={[s.navI, tab === x && s.navOn]}>
            {React.createElement(ICON[x], { size: 26, color: C.main, strokeWidth: tab === x ? 2.6 : 1.8 })}
            <Text style={[s.navT, tab === x && { color: C.main, fontWeight: '700' }]}>{x}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Home({ txs: all, setTxs, prefs, salary }: any) {
  const month = new Date().toISOString().slice(0, 7);
  const txs: Tx[] = all.filter((x: Tx) => x.date.startsWith(month));
  const [name, setName] = useState(''); const [val, setVal] = useState('');
  const [group, setGroup] = useState<Group | 'income'>('income');
  const income = txs.filter((t: Tx) => t.value > 0).reduce((a: number, t: Tx) => a + t.value, 0);
  const out = txs.filter((t: Tx) => t.value < 0).reduce((a: number, t: Tx) => a - t.value, 0);
  const spent = groupSpend(txs);
  const add = () => {
    const v = parseMoney(val);
    if (!name.trim() || v <= 0) return Alert.alert('Preencha descrição e valor.');
    setTxs([{ id: uid(), name: name.trim(), group, date: new Date().toISOString().slice(0, 10), value: group === 'income' ? v : -v }, ...all]);
    setName(''); setVal('');
  };
  return (<>
    <Card><H t="Saldo do mês" /><Text style={s.big}>{brl(income - out)}</Text>
      <Text style={s.mut}>Entradas {brl(income)} · Saídas {brl(out)}</Text></Card>
    <Card><H t="Nova transação" />
      <Inp placeholder="Descrição" value={name} onChangeText={setName} />
      <Inp placeholder="Valor (ex.: 25,90)" keyboardType="decimal-pad" value={val} onChangeText={setVal} />
      <View style={s.row}>{(['income', 'essential', 'lifestyle', 'future', 'debts'] as const).map(g => (
        <Pressable key={g} onPress={() => setGroup(g)} style={[s.chip, group === g && s.chipOn]}>
          <Text style={{ color: group === g ? '#fff' : C.dark, fontSize: 12 }}>{g === 'income' ? 'Entrada' : GROUPS[g]}</Text></Pressable>))}</View>
      <Btn t="Registrar" onPress={add} /></Card>
    <Card><H t="Minhas caixinhas" />
      <Text style={s.mut}>Cada entrada é dividida entre as caixinhas conforme o seu Perfil. Os gastos saem da caixinha da categoria.</Text>
      {salary > 0 && <Btn t={`Lançar salário (${brl(salary)})`} onPress={() => setTxs([{ id: uid(), name: 'Salário', group: 'income', date: new Date().toISOString().slice(0, 10), value: salary }, ...all])} />}
      {(Object.keys(GROUPS) as Group[]).filter(g => prefs[g] > 0).map(g => {
        const funded = income * prefs[g] / 100; const left = funded - spent[g];
        return (<View key={g} style={s.box}>
          <View style={s.line}><Text style={s.b}>{GROUPS[g]}</Text><Text style={s.mut}>{prefs[g]}% de cada entrada</Text></View>
          <Text style={[s.big, left < 0 && { color: '#d33' }]}>{brl(left)}</Text>
          <Bar pct={funded > 0 ? left / funded * 100 : 0} color={left < 0 ? '#d33' : C.main} />
          <Text style={s.mut}>Entrou {brl(funded)} · Gasto {brl(spent[g])}{left < 0 ? ' · caixinha estourada!' : ''}</Text></View>);
      })}</Card>
    <Card><H t="Últimos movimentos" />
      {txs.length === 0 && <Text style={s.mut}>Nenhum movimento ainda.</Text>}
      {txs.slice(0, 8).map((t: Tx) => (<View key={t.id} style={s.line}>
        <View><Text style={s.b}>{t.name}</Text><Text style={s.mut}>{t.group === 'income' ? 'Entrada' : GROUPS[t.group]} · {t.date}</Text></View>
        <Text style={{ color: t.value > 0 ? '#2a8a4a' : '#c33', fontWeight: '700' }}>{brl(t.value)}</Text></View>))}</Card>
  </>);
}

function Profile({ salary, setSalary, prefs, setPrefs }: any) {
  const G = Object.keys(GROUPS) as Group[];
  const toStr = (p: Prefs) => Object.fromEntries(G.map(g => [g, String(p[g])])) as Record<Group, string>;
  const [sal, setSal] = useState(salary ? String(salary).replace('.', ',') : '');
  const [draft, setDraft] = useState(toStr(prefs));
  const total = G.reduce((a, g) => a + parseMoney(draft[g]), 0);
  const valid = Math.abs(total - 100) < 0.01;
  const sv = parseMoney(sal);
  return (<>
    <Card><H t="Meu salário mensal" />
      <Inp placeholder="Ex.: 2500,00" keyboardType="decimal-pad" value={sal} onChangeText={setSal} /></Card>
    <Card><H t="Distribuição do salário" />
      <Text style={s.mut}>Escolha um modelo base ou personalize os percentuais.</Text>
      <View style={s.row}>{Object.keys(PRESETS).map(k => (
        <Pressable key={k} onPress={() => setDraft(toStr(PRESETS[k]))} style={s.chip}><Text style={{ color: C.dark, fontSize: 12 }}>{k}</Text></Pressable>))}</View>
      {G.map(g => (<View key={g} style={s.line}>
        <View style={{ flex: 1 }}><Text style={s.b}>{GROUPS[g]}</Text><Text style={s.mut}>{brl(sv * parseMoney(draft[g]) / 100)}</Text></View>
        <View style={{ width: 90 }}><Inp keyboardType="decimal-pad" value={draft[g]} onChangeText={(x: string) => setDraft({ ...draft, [g]: x })} /></View>
        <Text style={s.b}> %</Text></View>))}
      <Text style={{ color: valid ? '#2a8a4a' : '#d33', fontWeight: '700', marginVertical: 6 }}>
        Total: {total.toFixed(1).replace('.', ',')}% {valid ? '✓' : `(faltam ${(100 - total).toFixed(1).replace('.', ',')}%)`}</Text>
      <Btn t="Salvar" onPress={() => {
        if (!valid) return Alert.alert('A soma precisa ser 100%.');
        setPrefs(Object.fromEntries(G.map(g => [g, parseMoney(draft[g])])) as Prefs); setSalary(sv); Alert.alert('Salvo!');
      }} /></Card>
  </>);
}

function Goals({ goals, setGoals }: any) {
  const [title, setTitle] = useState(''); const [total, setTotal] = useState('');
  const [dep, setDep] = useState<Record<string, string>>({});
  return (<>
    <Card><H t="Nova meta" />
      <Inp placeholder="Ex.: Intercâmbio" value={title} onChangeText={setTitle} />
      <Inp placeholder="Valor da meta" keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
      <Btn t="Criar meta" onPress={() => { const v = parseMoney(total); if (!title.trim() || v <= 0) return;
        setGoals([...goals, { id: uid(), title: title.trim(), saved: 0, total: v }]); setTitle(''); setTotal(''); }} /></Card>
    {goals.map((g: Goal) => (<Card key={g.id}>
      <View style={s.line}><Text style={s.b}>{g.title}</Text><Text style={s.mut}>{Math.round(g.saved / g.total * 100)}%</Text></View>
      <Bar pct={g.saved / g.total * 100} /><Text style={s.mut}>{brl(g.saved)} de {brl(g.total)}</Text>
      <View style={s.row}><View style={{ flex: 1 }}><Inp placeholder="Guardar R$" keyboardType="decimal-pad" value={dep[g.id] || ''} onChangeText={(t: string) => setDep({ ...dep, [g.id]: t })} /></View>
        <Btn t="Guardar" onPress={() => { const v = parseMoney(dep[g.id] || ''); if (v <= 0) return;
          setGoals(goals.map((x: Goal) => x.id === g.id ? { ...x, saved: x.saved + v } : x)); setDep({ ...dep, [g.id]: '' }); }} /></View></Card>))}
  </>);
}

function Debts({ debts, setDebts }: any) {
  const [f, setF] = useState({ creditor: '', balance: '', rate: '', min: '', day: '' });
  const [strategy, setStrategy] = useState<'balance' | 'rate'>('balance');
  const [extra, setExtra] = useState('');
  const total = debts.reduce((a: number, d: Debt) => a + d.balance, 0);
  const add = () => {
    const d = { id: uid(), creditor: f.creditor.trim(), balance: parseMoney(f.balance), interestRate: parseMoney(f.rate), minPayment: parseMoney(f.min), dueDay: Math.round(parseMoney(f.day)) };
    if (!d.creditor || d.balance <= 0 || d.dueDay < 1 || d.dueDay > 31) return Alert.alert('Confira credor, saldo e dia (1 a 31).');
    setDebts([...debts, d]); setF({ creditor: '', balance: '', rate: '', min: '', day: '' });
  };
  const pay = (id: string, amount: number) => setDebts(debts.map((d: Debt) => d.id === id ? { ...d, balance: Math.max(0, d.balance - amount) } : d));
  const plan = debts.length ? payoffPlan(debts.filter((d: Debt) => d.balance > 0), strategy, parseMoney(extra)) : null;
  return (<>
    <Card><H t="Total devedor" /><Text style={s.big}>{brl(total)}</Text></Card>
    <Card><H t="Nova dívida" />
      <Inp placeholder="Credor" value={f.creditor} onChangeText={(t: string) => setF({ ...f, creditor: t })} />
      <Inp placeholder="Saldo devedor" keyboardType="decimal-pad" value={f.balance} onChangeText={(t: string) => setF({ ...f, balance: t })} />
      <Inp placeholder="Juros ao mês (%)" keyboardType="decimal-pad" value={f.rate} onChangeText={(t: string) => setF({ ...f, rate: t })} />
      <Inp placeholder="Parcela mínima" keyboardType="decimal-pad" value={f.min} onChangeText={(t: string) => setF({ ...f, min: t })} />
      <Inp placeholder="Dia do vencimento" keyboardType="number-pad" value={f.day} onChangeText={(t: string) => setF({ ...f, day: t })} />
      <Btn t="Cadastrar" onPress={add} /></Card>
    {debts.map((d: Debt) => (<Card key={d.id}>
      <View style={s.line}><Text style={s.b}>{d.creditor}</Text><Text style={s.b}>{brl(d.balance)}</Text></View>
      <Text style={s.mut}>{d.interestRate}% a.m. · mínima {brl(d.minPayment)} · vence dia {d.dueDay}</Text>
      <View style={s.row}><Btn alt t="Pagar parcela" onPress={() => { pay(d.id, d.minPayment); Alert.alert('Parabéns! 🎉', 'Pagamento registrado.'); }} />
        <Btn alt t="Remover" onPress={() => setDebts(debts.filter((x: Debt) => x.id !== d.id))} /></View></Card>))}
    {plan && <Card><H t="Plano de quitação" />
      <View style={s.row}>{([['balance', 'Menor saldo'], ['rate', 'Maior juro']] as const).map(([k, l]) => (
        <Pressable key={k} onPress={() => setStrategy(k)} style={[s.chip, strategy === k && s.chipOn]}>
          <Text style={{ color: strategy === k ? '#fff' : C.dark }}>{l} primeiro</Text></Pressable>))}</View>
      <Inp placeholder="Valor extra por mês (opcional)" keyboardType="decimal-pad" value={extra} onChangeText={setExtra} />
      <Text style={s.mut}>Ordem: {plan.order.join(' → ')}</Text>
      <Text style={s.b}>{plan.ok ? `Quitação em ${plan.months} meses · juros ${brl(plan.interest)}` : 'Com esses valores a dívida não zera: aumente o extra.'}</Text></Card>}
  </>);
}

function Learn({ progress, setProgress }: any) {
  const done = LESSONS.filter(l => progress[l.id] === 1).length;
  return (<>
    <Card><H t="Trilha: Primeiros passos" /><Bar pct={done / LESSONS.length * 100} />
      <Text style={s.mut}>{done}/{LESSONS.length} lições {done === LESSONS.length ? '· 🏅 Selo conquistado!' : ''}</Text></Card>
    {LESSONS.map(l => (<Card key={l.id}><Text style={s.b}>{l.title}</Text><Text style={s.mut}>{l.q}</Text>
      {l.opts.map((o, i) => (<Pressable key={i} style={s.opt} onPress={() => {
        const ok = i === l.ok; setProgress({ ...progress, [l.id]: ok ? 1 : 0 }); Alert.alert(ok ? 'Acertou! ✅' : 'Quase!', ok ? '' : 'Tente de novo.'); }}>
        <Text style={{ color: C.dark }}>{o}</Text></Pressable>))}
      {progress[l.id] === 1 && <Text style={{ color: '#2a8a4a' }}>Concluída ✓</Text>}</Card>))}
  </>);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, logo: { fontSize: 30, color: C.main, fontWeight: '300', letterSpacing: 2, textAlign: 'center', paddingTop: 12 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  h: { fontSize: 13, color: C.main, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }, big: { fontSize: 28, color: C.dark, fontWeight: '700' },
  b: { color: C.dark, fontWeight: '600', fontSize: 15 }, mut: { color: '#8a6772', fontSize: 13, marginVertical: 2 },
  inp: { borderWidth: 1, borderColor: C.soft, borderRadius: 10, padding: 10, marginBottom: 8, color: C.dark, backgroundColor: '#fffafb' },
  btn: { backgroundColor: C.main, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', marginTop: 4, marginRight: 6 },
  btnAlt: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.main }, btnT: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 }, line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  chip: { borderWidth: 1, borderColor: C.main, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }, chipOn: { backgroundColor: C.main },
  box: { borderWidth: 1, borderColor: C.soft, borderRadius: 14, padding: 12, marginTop: 10, backgroundColor: '#fffafb' },
  barBg: { height: 8, backgroundColor: C.soft, borderRadius: 4, overflow: 'hidden', marginVertical: 4 }, barFg: { height: 8, borderRadius: 4 },
  opt: { borderWidth: 1, borderColor: C.soft, borderRadius: 10, padding: 10, marginTop: 6 },
  nav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 2, borderColor: C.main, paddingVertical: 6, paddingHorizontal: 4, elevation: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 },
  navI: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 14, marginHorizontal: 2 }, navOn: { backgroundColor: C.soft },
  navT: { color: '#b08a95', fontSize: 12, marginTop: 2 },
});
