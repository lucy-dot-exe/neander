import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { evalExpr, type Assembly } from '../neander/assembler';
import type { View } from '../neander/format';
import { OPS, bin, hx, opOf, signed } from '../neander/isa';
import type { Machine } from '../neander/machine';
import { Lamps } from './Lamps';

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
  const { t } = useI18n();
  const d = t.detail;
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const v = m.mem[a], role = program.role[a], line = program.lineOf[a];
  const name = opOf(v);
  const label = program.labelAt[a];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = evalExpr(input, program.sym);
    if (r.err !== undefined) return setMsg({ text: d.badValue(r.err(t)), error: true });
    if (r.v < -128 || r.v > 255) return setMsg({ text: d.tooBig(r.v), error: true });
    onWrite(a, r.v);
    setInput('');
    setMsg({ text: d.written(view.fmtV(r.v), view.fmtA(a)), error: false });
  };

  return (
    <div className="detail" aria-live="polite">
      <div className="detail-head">
        <span className="eyebrow">{d.address}</span>
        <h3>{view.fmtA(a)}</h3>
        <div className="chips">
          {label && <span className="chip label">{label}</span>}
          <span className="chip">{role ? d.roles[role] : d.outside}</span>
          {a === m.pc && <span className="chip running">PC</span>}
        </div>
        <button className="close" type="button" title={d.close} aria-label={d.closeLabel} onClick={onClose}>
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
          <div><dt>{d.unsigned}</dt><dd>{v}</dd></div>
          <div><dt>{d.signed}</dt><dd>{signed(v)}</dd></div>
          <div><dt>{d.binary}</dt><dd>{bin(v)}</dd></div>
          <div className="wide">
            <dt>{d.asInstruction}</dt>
            <dd>{name ? (OPS[name].size === 2 ? `${name} ${view.ref(m.mem[(a + 1) & 255])}` : name) : d.noInstruction}</dd>
          </div>
          <div className="wide">
            <dt>{d.accesses}</dt>
            <dd>
              {d.counts(m.fetches[a], m.reads[a], m.writes[a])}
              {m.lastWrite === a ? d.lastWrite : m.lastRead === a ? d.lastRead : ''}
            </dd>
          </div>
          <div className="wide">
            <dt>{d.source}</dt>
            <dd>
              {role && line ? (
                <>
                  <button className="linkish" type="button" onClick={() => onGotoLine(line)}>{t.program.line(line)}</button>{' '}
                  <span className="muted">{program.source.split(/\r?\n/)[line - 1]?.trim()}</span>
                </>
              ) : (
                <span className="muted">{d.noSource}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <form className="d-form" autoComplete="off" onSubmit={submit}>
        <input value={input} onChange={e => setInput(e.target.value)} spellCheck={false} placeholder={d.placeholder} aria-label={d.newValue} />
        <button className="btn" type="submit">{d.write}</button>
      </form>
      {msg && <p className={msg.error ? 'd-msg err' : 'd-msg'}>{msg.text}</p>}
    </div>
  );
}
