import type { Text } from '../i18n/messages';
import { OPS, hx, isDirective, isOp } from './isa';

export type Role = 'op' | 'arg' | 'data' | 'res' | null;

export interface Sym {
  name: string;
  value: number;
  kind: 'addr' | 'equ';
  line: number;
}

export interface AsmError {
  line: number;
  msg: Text;
}

export interface Assembly {
  source: string;
  mem: Uint8Array;
  /** What each byte is: an opcode, an instruction's operand, data (DB) or reserved space (DS). */
  role: Role[];
  /** Source line (1-based) that produced each byte; 0 when none did. */
  lineOf: number[];
  /** First address each source line produced. */
  lineAddr: Map<number, number>;
  /** Labels and constants, keyed by upper-case name. */
  sym: Map<string, Sym>;
  labelAt: (string | null)[];
  errors: AsmError[];
  bytes: number;
}

export function parseNum(t: string): number | null {
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (/^[0-9][0-9a-f]*h$/i.test(t)) return parseInt(t.slice(0, -1), 16);
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t.slice(2), 16);
  if (/^0b[01]+$/i.test(t)) return parseInt(t.slice(2), 2);
  if (/^[01]+b$/i.test(t)) return parseInt(t.slice(0, -1), 2);
  return null;
}

export type EvalResult = { v: number; err?: undefined } | { v?: undefined; err: Text };

/** Evaluates `term (+|- term)*`, where a term is a number or a label. */
export function evalExpr(s: string, sym: Map<string, Sym>): EvalResult {
  const src = (s || '').replace(/\s+/g, '');
  if (!src) return { err: t => t.asm.missingValue };
  const toks = src.match(/[+-]|[^+-]+/g) ?? [];
  let total = 0, sign = 1, want = true;
  for (const t of toks) {
    if (t === '+' || t === '-') {
      if (t === '-') sign = -sign;
      want = true;
      continue;
    }
    if (!want) return { err: m => m.asm.unexpected(t) };
    let v = parseNum(t);
    if (v === null) {
      if (!/^[A-Za-z_]\w*$/.test(t)) return { err: m => m.asm.notNumber(t) };
      const e = sym.get(t.toUpperCase());
      if (!e) return { err: m => m.asm.undefinedLabel(t) };
      v = e.value;
    }
    total += sign * v;
    sign = 1;
    want = false;
  }
  if (want) return { err: t => t.asm.trailingOperator };
  return { v: total };
}

type Item =
  | { kind: 'ins'; ln: number; addr: number; op: keyof typeof OPS; args: string }
  | { kind: 'db'; ln: number; addr: number; parts: string[] }
  | { kind: 'ds'; ln: number; addr: number; size: number };

/** Two-pass assembler: pass 1 places labels, pass 2 writes the bytes. */
export function assemble(source: string): Assembly {
  const lines = source.split(/\r?\n/);
  const errors: AsmError[] = [];
  const sym = new Map<string, Sym>();
  const items: Item[] = [];
  const err = (line: number, msg: Text) => errors.push({ line, msg });
  let lc = 0;

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    let text = lines[i];
    const sc = text.indexOf(';');
    if (sc >= 0) text = text.slice(0, sc);
    let label: string | null = null;
    const lm = text.match(/^\s*([A-Za-z_]\w*)\s*:/);
    if (lm) {
      label = lm[1];
      text = text.slice(lm[0].length);
    }
    text = text.trim();

    let mnem = '', args = '';
    if (text) {
      const eq = !label && text.match(/^([A-Za-z_]\w*)\s+EQU\b\s*(.*)$/i);
      if (eq) {
        label = eq[1];
        mnem = 'EQU';
        args = eq[2].trim();
      } else {
        const om = text.match(/^([A-Za-z_]\w*)\b\s*(.*)$/);
        if (!om) {
          err(ln, t => t.asm.expectedInstruction(text));
          continue;
        }
        mnem = om[1].toUpperCase();
        args = om[2].trim();
      }
    }
    if (label) {
      const K = label.toUpperCase();
      if (isOp(K) || isDirective(K)) {
        const name = label;
        err(ln, t => t.asm.reservedLabel(name));
        label = null;
      } else if (sym.has(K)) {
        const name = label, first = sym.get(K)!.line;
        err(ln, t => t.asm.duplicateLabel(name, first));
        label = null;
      }
    }
    if (mnem === 'EQU') {
      if (!label) {
        if (!errors.some(e => e.line === ln)) err(ln, t => t.asm.equNeedsName);
        continue;
      }
      const r = evalExpr(args, sym);
      if (r.err !== undefined) {
        err(ln, r.err);
        continue;
      }
      sym.set(label.toUpperCase(), { name: label, value: r.v, kind: 'equ', line: ln });
      continue;
    }
    if (label) sym.set(label.toUpperCase(), { name: label, value: lc, kind: 'addr', line: ln });
    if (!mnem) continue;
    if (mnem === 'END') break;
    if (mnem === 'ORG') {
      const r = evalExpr(args, sym);
      if (r.err !== undefined) {
        const e = r.err;
        err(ln, t => 'ORG: ' + e(t));
        continue;
      }
      if (r.v < 0 || r.v > 255) {
        const v = r.v;
        err(ln, t => t.asm.orgOutside(v));
        continue;
      }
      lc = r.v;
      if (label) sym.get(label.toUpperCase())!.value = lc;
      continue;
    }
    if (mnem === 'DB') {
      if (!args) {
        err(ln, t => t.asm.dbEmpty);
        continue;
      }
      const parts = args.split(',');
      items.push({ kind: 'db', ln, addr: lc, parts });
      lc += parts.length;
      continue;
    }
    if (mnem === 'DS') {
      const r = evalExpr(args, sym);
      if (r.err !== undefined) {
        const e = r.err;
        err(ln, t => 'DS: ' + e(t));
        continue;
      }
      if (r.v < 1 || r.v > 256) {
        err(ln, t => t.asm.dsSize);
        continue;
      }
      items.push({ kind: 'ds', ln, addr: lc, size: r.v });
      lc += r.v;
      continue;
    }
    if (!isOp(mnem)) {
      const name = mnem;
      err(ln, t => t.asm.unknownInstruction(name));
      continue;
    }
    const op = OPS[mnem];
    if (op.size === 1 && args) {
      err(ln, t => t.asm.noOperand(mnem));
      continue;
    }
    if (op.size === 2 && !args) {
      err(ln, t => t.asm.needsAddress(mnem));
      continue;
    }
    items.push({ kind: 'ins', ln, addr: lc, op: mnem, args });
    lc += op.size;
  }

  const mem = new Uint8Array(256);
  const role: Role[] = new Array(256).fill(null);
  const lineOf: number[] = new Array(256).fill(0);
  const lineAddr = new Map<number, number>();
  const put = (a: number, v: number, r: Role, ln: number) => {
    if (a > 255) {
      err(ln, t => t.asm.pastEnd);
      return false;
    }
    if (role[a]) {
      const other = lineOf[a];
      err(ln, t => t.asm.addressUsed(hx(a), other));
      return false;
    }
    mem[a] = v & 255;
    role[a] = r;
    lineOf[a] = ln;
    if (!lineAddr.has(ln)) lineAddr.set(ln, a);
    return true;
  };

  for (const it of items) {
    if (it.kind === 'ins') {
      const op = OPS[it.op];
      if (!put(it.addr, op.code, 'op', it.ln) || op.size === 1) continue;
      const r = evalExpr(it.args, sym);
      if (r.err !== undefined) {
        err(it.ln, r.err);
        continue;
      }
      if (r.v < 0 || r.v > 255) {
        const v = r.v;
        err(it.ln, t => t.asm.addressOutside(v));
        continue;
      }
      put(it.addr + 1, r.v, 'arg', it.ln);
    } else if (it.kind === 'db') {
      for (let k = 0; k < it.parts.length; k++) {
        const r = evalExpr(it.parts[k], sym);
        if (r.err !== undefined) {
          err(it.ln, r.err);
          break;
        }
        if (r.v < -128 || r.v > 255) {
          const v = r.v;
          err(it.ln, t => t.asm.byteRange(v));
          break;
        }
        if (!put(it.addr + k, r.v, 'data', it.ln)) break;
      }
    } else {
      for (let k = 0; k < it.size; k++) if (!put(it.addr + k, 0, 'res', it.ln)) break;
    }
  }

  const labelAt: (string | null)[] = new Array(256).fill(null);
  for (const s of sym.values()) if (s.kind === 'addr' && s.value < 256 && !labelAt[s.value]) labelAt[s.value] = s.name;
  errors.sort((a, b) => a.line - b.line);
  return { source, mem, role, lineOf, lineAddr, sym, labelAt, errors, bytes: role.filter(Boolean).length };
}

/** True when two assemblies put the same bytes, with the same roles, at the same addresses. */
export const sameImage = (a: Assembly, b: Assembly) =>
  a.mem.every((v, i) => v === b.mem[i]) && a.role.every((r, i) => r === b.role[i]);
