import type { Messages } from '../i18n/messages';
import type { Assembly } from './assembler';
import { OPS, bin, h2, hx, opOf } from './isa';
import type { Machine, TraceRec } from './machine';

export type Base = 'hex' | 'dec' | 'bin';

export interface DisplayFormat {
  addr: Base;
  val: Base;
}

export const fmtAs = (base: Base, v: number) => (base === 'dec' ? String(v & 255) : base === 'bin' ? bin(v) : hx(v));

export interface View {
  fmtA: (a: number) => string;
  fmtV: (v: number) => string;
  /** An address as its label (or label+offset), falling back to the address format. */
  ref: (a: number) => string;
  /** The instruction a byte decodes to, with its operand resolved to a label when possible. */
  insText: (byte: number, operand: number) => string;
}

export function makeView(fmt: DisplayFormat, program: Assembly): View {
  const fmtA = (a: number) => fmtAs(fmt.addr, a);
  const fmtV = (v: number) => fmtAs(fmt.val, v);
  const ref = (a: number) => {
    const L = program.labelAt;
    if (L[a]) return L[a]!;
    for (let k = 1; k <= 8 && a - k >= 0; k++) {
      if (!program.role[a - k + 1] || !program.role[a - k]) break;
      if (L[a - k]) return `${L[a - k]}+${k}`;
    }
    return fmtA(a);
  };
  const insText = (byte: number, operand: number) => {
    const name = opOf(byte);
    if (!name) return `?${h2(byte)}`;
    return OPS[name].size === 2 ? `${name} ${ref(operand)}` : name;
  };
  return { fmtA, fmtV, ref, insText };
}

/** The instruction a history entry ran, with its operand as a label when possible. */
export function recIns(r: TraceRec, view: View): string {
  if (r.kind === 'edit') return `MEM[${view.fmtA(r.at)}]`;
  return r.name ? (r.addr === null ? r.name : `${r.name} ${view.ref(r.addr)}`) : `?${h2(r.byte)}`;
}

/** [instruction, effect] for a history entry, in the current display format. */
export function recText(r: TraceRec, view: View, t: Messages): [string, string] {
  const { fmtA, fmtV } = view;
  const ins = recIns(r, view);
  if (r.kind === 'edit') return [ins, t.trace.edited(fmtV(r.old), fmtV(r.val))];
  switch (r.name) {
    case 'STA': return [ins, `MEM[${fmtA(r.addr!)}] ← ${fmtV(r.ac1)}`];
    case 'LDA':
    case 'ADD':
    case 'OR':
    case 'AND':
    case 'NOT': return [ins, `AC ${fmtV(r.ac0)} → ${fmtV(r.ac1)}  N=${r.fn} Z=${r.fz}`];
    case 'JMP': return [ins, `PC ← ${fmtA(r.addr!)}`];
    case 'JN': return [ins, r.jumped ? t.trace.jumped('N', fmtA(r.addr!)) : t.trace.noJump('N')];
    case 'JZ': return [ins, r.jumped ? t.trace.jumped('Z', fmtA(r.addr!)) : t.trace.noJump('Z')];
    case 'HLT': return [ins, t.trace.halted];
    case 'NOP': return [ins, t.trace.nothing];
    default: return [ins, t.trace.notOpcode(hx(r.byte))];
  }
}

/** [instruction, what it will do] for the instruction at PC. */
export function describeNext(m: Machine, view: View, t: Messages): [string, string] {
  const { fmtA, fmtV, ref, insText } = view;
  if (m.halted) return [t.next.halted, t.next.haltedWhat];
  const b = m.mem[m.pc], name = opOf(b), a = m.mem[(m.pc + 1) & 255], v = m.mem[a], ac = m.ac;
  const r = ref(a), loc = r === fmtA(a) ? r : `${r} (${fmtA(a)})`;
  switch (name) {
    case 'STA': return [insText(b, a), `MEM[${loc}] ← AC = ${fmtV(ac)}`];
    case 'LDA': return [insText(b, a), `AC ← MEM[${loc}] = ${fmtV(v)}`];
    case 'ADD': return [insText(b, a), `AC ← ${fmtV(ac)} + ${fmtV(v)} = ${fmtV(ac + v)}`];
    case 'OR': return [insText(b, a), `AC ← ${fmtV(ac)} OR ${fmtV(v)} = ${fmtV(ac | v)}`];
    case 'AND': return [insText(b, a), `AC ← ${fmtV(ac)} AND ${fmtV(v)} = ${fmtV(ac & v)}`];
    case 'NOT': return ['NOT', `AC ← NOT ${fmtV(ac)} = ${fmtV(~ac)}`];
    case 'JMP': return [insText(b, a), `PC ← ${loc}`];
    case 'JN': return [insText(b, a), m.n ? t.next.jumps('N', loc) : t.next.continues('N', fmtA(m.pc + 2))];
    case 'JZ': return [insText(b, a), m.z ? t.next.jumps('Z', loc) : t.next.continues('Z', fmtA(m.pc + 2))];
    case 'HLT': return ['HLT', t.next.hlt];
    case 'NOP': return ['NOP', t.next.nop];
    default: return [`?${h2(b)}`, t.next.notOpcode(fmtV(b))];
  }
}

/** What a memory byte is, for the memory table's last column. */
export function meaning(a: number, m: Machine, program: Assembly, view: View, t: Messages): { text: string; soft: boolean } {
  const r = program.role[a], v = m.mem[a];
  if (r === 'op') {
    if (!opOf(v)) return { text: t.meaning.notOpcode(view.fmtV(v)), soft: true };
    return { text: view.insText(v, m.mem[(a + 1) & 255]), soft: false };
  }
  if (r === 'arg') return { text: t.meaning.operand, soft: true };
  if (r === 'data') return { text: m.writes[a] ? t.meaning.dataChanged : t.meaning.data, soft: true };
  if (r === 'res') return { text: t.meaning.reserved, soft: true };
  if (m.writes[a]) return { text: t.meaning.written, soft: true };
  return { text: '', soft: true };
}
