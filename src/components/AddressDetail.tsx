import { useState } from 'react';
import { evalExpr, type Assembly } from '../neander/assembler';
import type { View } from '../neander/format';
import { OPS, bin, hx, opOf, signed } from '../neander/isa';
import type { Machine } from '../neander/machine';
import { Lamps } from './Lamps';

const ROLE_NAME = { op: 'Instrução', arg: 'Operando', data: 'Dado', res: 'Reservado' } as const;

interface Props {
  a: number;
  machine: Machine;
  program: Assembly;
  view: View;
  onClose(): void;
  onWrite(a: number, v: number): void;
  onGotoLine(line: number): void;
}

/** Everything about one memory address, plus a box to change its value by hand. */
export function AddressDetail({ a, machine: m, program, view, onClose, onWrite, onGotoLine }: Props) {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const v = m.mem[a], role = program.role[a], line = program.lineOf[a];
  const name = opOf(v);
  const label = program.labelAt[a];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = evalExpr(input, program.sym);
    if (r.err !== undefined) return setMsg({ text: `${r.err}. Tente 7, 07h, -1 ou 1010b.`, error: true });
    if (r.v < -128 || r.v > 255) return setMsg({ text: `${r.v} não cabe em um byte (-128 a 255).`, error: true });
    onWrite(a, r.v);
    setInput('');
    setMsg({ text: `${view.fmtV(r.v)} gravado em ${view.fmtA(a)}. Voltar desfaz.`, error: false });
  };

  return (
    <div className="detail" aria-live="polite">
      <div className="detail-head">
        <span className="eyebrow">Endereço</span>
        <h3>{view.fmtA(a)}</h3>
        <div className="chips">
          {label && <span className="chip label">{label}</span>}
          <span className="chip">{role ? ROLE_NAME[role] : 'Fora do programa'}</span>
          {a === m.pc && <span className="chip running">PC</span>}
        </div>
        <button className="close" type="button" title="Fechar" aria-label="Fechar detalhes" onClick={onClose}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div className="detail-main">
        <div className="d-value">
          <b>{view.fmtV(v)}</b>
          <Lamps value={v} small />
        </div>
        <dl className="d-grid">
          <div><dt>Hex</dt><dd>{hx(v)}</dd></div>
          <div><dt>Sem sinal</dt><dd>{v}</dd></div>
          <div><dt>Com sinal</dt><dd>{signed(v)}</dd></div>
          <div><dt>Binário</dt><dd>{bin(v)}</dd></div>
          <div className="wide">
            <dt>Lido como instrução</dt>
            <dd>{name ? (OPS[name].size === 2 ? `${name} ${view.ref(m.mem[(a + 1) & 255])}` : name) : 'nenhuma (executa como NOP)'}</dd>
          </div>
          <div className="wide">
            <dt>Acessos</dt>
            <dd>
              buscado {m.fetches[a]} · lido {m.reads[a]} · gravado {m.writes[a]}
              {m.lastWrite === a ? ' · gravado pela última instrução' : m.lastRead === a ? ' · lido pela última instrução' : ''}
            </dd>
          </div>
          <div className="wide">
            <dt>Código-fonte</dt>
            <dd>
              {role && line ? (
                <>
                  <button className="linkish" type="button" onClick={() => onGotoLine(line)}>Linha {line}</button>{' '}
                  <span className="muted">{program.source.split(/\r?\n/)[line - 1]?.trim()}</span>
                </>
              ) : (
                <span className="muted">Sem linha de código; este byte não foi montado.</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <form className="d-form" autoComplete="off" onSubmit={submit}>
        <input value={input} onChange={e => setInput(e.target.value)} spellCheck={false} placeholder="Novo valor: 7, 07h, -1…" aria-label="Novo valor" />
        <button className="btn" type="submit">Gravar</button>
      </form>
      {msg && <p className={msg.error ? 'd-msg err' : 'd-msg'}>{msg.text}</p>}
    </div>
  );
}
