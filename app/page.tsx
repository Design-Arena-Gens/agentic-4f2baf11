"use client";
import { useEffect, useMemo, useState } from "react";

type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // in major units (e.g. 12.34)
  category: string;
  note: string;
};

const STORAGE_KEY = "expenses_v1";
const CATEGORIES = ["Groceries", "Dining", "Transport", "Housing", "Health", "Entertainment", "Utilities", "Travel", "Other"];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(isNaN(n) ? 0 : n);
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonthISO(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [note, setNote] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(() => monthKey(new Date().toISOString().slice(0,10)));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExpenses(JSON.parse(raw) as Expense[]);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {}
  }, [expenses]);

  const filtered = useMemo(() => expenses.filter(e => monthKey(e.date) === filterMonth), [expenses, filterMonth]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const byCategory = new Map<string, number>();
    for (const e of filtered) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    return { total, byCategory };
  }, [filtered]);

  function addExpense() {
    const value = parseFloat(amount);
    if (!date || isNaN(value) || value <= 0) return;
    const item: Expense = {
      id: crypto.randomUUID(),
      date,
      amount: Math.round(value * 100) / 100,
      category,
      note: note.trim(),
    };
    setExpenses(prev => [item, ...prev]);
    setAmount("");
    setNote("");
  }

  function removeExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function currentMonthHuman(): string {
    const [y, m] = filterMonth.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  const monthsAvailable = useMemo(() => {
    const keys = Array.from(new Set(expenses.map(e => monthKey(e.date)))).sort().reverse();
    if (keys.length === 0) keys.push(monthKey(new Date().toISOString().slice(0,10)));
    return keys;
  }, [expenses]);

  return (
    <div className="grid">
      <header className="header">
        <div>
          <div className="h1">Personal Expenses</div>
          <div className="muted">Minimal, private, stored in your browser</div>
        </div>
        <div className="kpis">
          <span className="badge"><span>Month</span>
            <select className="select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {monthsAvailable.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
          </span>
        </div>
      </header>

      <section className="summary">
        <div className="card">
          <h3>Total this month</h3>
          <div className="value">{formatCurrency(totals.total)}</div>
        </div>
        <div className="card">
          <h3>Transactions</h3>
          <div className="value">{filtered.length}</div>
        </div>
        <div className="card">
          <h3>Top category</h3>
          <div className="value">
            {(() => {
              if (totals.byCategory.size === 0) return "?";
              const top = Array.from(totals.byCategory.entries()).sort((a,b) => b[1]-a[1])[0];
              return `${top[0]} (${formatCurrency(top[1])})`;
            })()}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="form">
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0,10)} />
          <input className="input" type="number" step="0.01" min="0" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <input className="input" type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          <button className="button" onClick={addExpense}>Add</button>
        </div>
        <div className="sep" />
        <table className="table">
          <thead>
            <tr className="tr">
              <th className="th">Date</th>
              <th className="th">Category</th>
              <th className="th">Note</th>
              <th className="th">Amount</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="tr">
                <td className="td">{new Date(e.date + 'T00:00:00').toLocaleDateString()}</td>
                <td className="td">{e.category}</td>
                <td className="td" title={e.note}>{e.note || <span className="muted">?</span>}</td>
                <td className="td">{formatCurrency(e.amount)}</td>
                <td className="td" style={{textAlign:'right'}}>
                  <button className="button secondary" onClick={() => removeExpense(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="tr">
                <td className="td" colSpan={5}><span className="muted">No expenses for {currentMonthHuman()} yet.</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{padding:16}}>
        <h3 className="muted" style={{marginTop:0}}>Breakdown by category</h3>
        {CATEGORIES.map(cat => {
          const value = totals.byCategory.get(cat) ?? 0;
          const pct = totals.total > 0 ? Math.round((value / totals.total) * 100) : 0;
          return (
            <div key={cat} style={{marginBottom:10}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--muted)'}}>
                <span>{cat}</span>
                <span>{formatCurrency(value)} ? {pct}%</span>
              </div>
              <div style={{height:8, background:'#0b0c10', border:'1px solid var(--border)', borderRadius:999}}>
                <div style={{width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--accent),var(--accent-2))', borderRadius:999}} />
              </div>
            </div>
          );
        })}
      </section>

      <footer className="footer">Data never leaves your browser ? Change month to review history</footer>
    </div>
  );
}
