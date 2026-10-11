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

/** [instruction, effect] for a history entry, in the current display format. */
export function recText(t: TraceRec, view: View): [string, string] {
  const { fmtA, fmtV, ref } = view;
  if (t.kind === 'edit') return [`MEM[${fmtA(t.at)}]`, `alterado à mão: ${fmtV(t.old)} → ${fmtV(t.val)}`];
  const ins = t.name ? (t.addr === null ? t.name : `${t.name} ${ref(t.addr)}`) : `?${h2(t.byte)}`;
  switch (t.name) {
    case 'STA': return [ins, `MEM[${fmtA(t.addr!)}] ← ${fmtV(t.ac1)}`];
    case 'LDA':
    case 'ADD':
    case 'OR':
    case 'AND':
    case 'NOT': return [ins, `AC ${fmtV(t.ac0)} → ${fmtV(t.ac1)}  N=${t.fn} Z=${t.fz}`];
    case 'JMP': return [ins, `PC ← ${fmtA(t.addr!)}`];
    case 'JN': return [ins, t.jumped ? `N=1, desviou para ${fmtA(t.addr!)}` : 'N=0, sem desvio'];
    case 'JZ': return [ins, t.jumped ? `Z=1, desviou para ${fmtA(t.addr!)}` : 'Z=0, sem desvio'];
    case 'HLT': return [ins, 'Máquina parada'];
    case 'NOP': return [ins, 'Nada'];
    default: return [ins, `${hx(t.byte)} não é um opcode do Neander; executado como NOP`];
  }
}

/** [instruction, what it will do] for the instruction at PC. */
export function describeNext(m: Machine, view: View): [string, string] {
  const { fmtA, fmtV, ref, insText } = view;
  if (m.halted) return ['Parado', 'O HLT foi executado. Clique em Reiniciar para recomeçar ou em Voltar para desfazer.'];
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
    case 'JN': return [insText(b, a), m.n ? `N = 1, então desvia para ${loc}` : `N = 0, então continua em ${fmtA(m.pc + 2)}`];
    case 'JZ': return [insText(b, a), m.z ? `Z = 1, então desvia para ${loc}` : `Z = 0, então continua em ${fmtA(m.pc + 2)}`];
    case 'HLT': return ['HLT', 'Para a máquina'];
    case 'NOP': return ['NOP', 'Não faz nada e segue em frente'];
    default: return [`?${h2(b)}`, `${fmtV(b)} não é opcode; é executado como NOP`];
  }
}

/** What a memory byte is, for the memory table's last column. */
export function meaning(a: number, m: Machine, program: Assembly, view: View): { text: string; soft: boolean } {
  const r = program.role[a], v = m.mem[a];
  if (r === 'op') {
    if (!opOf(v)) return { text: `${view.fmtV(v)}: não é opcode`, soft: true };
    return { text: view.insText(v, m.mem[(a + 1) & 255]), soft: false };
  }
  if (r === 'arg') return { text: '↳ operando', soft: true };
  if (r === 'data') return { text: m.writes[a] ? 'dado · alterado' : 'dado', soft: true };
  if (r === 'res') return { text: 'reservado', soft: true };
  if (m.writes[a]) return { text: 'gravado durante a execução', soft: true };
  return { text: '', soft: true };
}
