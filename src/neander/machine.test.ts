import { describe, expect, it } from 'vitest';
import type { Lang } from '../i18n/messages';
import { assemble } from './assembler';
import { EXAMPLES } from './examples';
import { Machine } from './machine';

const result: Record<Lang, Record<string, [label: string, value: number]>> = {
  'pt-BR': { sum: ['R', 42], mul: ['R', 42], max: ['MAIOR', 42], array: ['SOMA', 42] },
  en: { sum: ['R', 42], mul: ['R', 42], max: ['MAX', 42], array: ['SUM', 42] }
};
const versions = EXAMPLES.flatMap(e => (['pt-BR', 'en'] as const).map(lang => [e.id, lang, e.src[lang]] as const));

function runToHalt(m: Machine, limit = 5000) {
  while (!m.halted && m.steps < limit) m.step();
}

describe('Machine', () => {
  it.each(versions)('runs the %s example (%s) to the expected result', (id, lang, src) => {
    const p = assemble(src);
    expect(p.errors).toEqual([]);
    const m = new Machine();
    m.reset(p.mem);
    runToHalt(m);
    expect(m.halted).toBe(true);
    const [label, value] = result[lang][id];
    expect(m.mem[p.sym.get(label)!.value]).toBe(value);
  });

  it('undoes every step back to the loaded state', () => {
    const p = assemble(EXAMPLES.find(e => e.id === 'array')!.src['pt-BR']);
    const m = new Machine();
    m.reset(p.mem);
    runToHalt(m);
    expect(m.steps).toBe(58);
    while (m.back());
    expect([m.pc, m.ac, m.n, m.z, m.steps, m.accesses, m.halted]).toEqual([0, 0, 0, 1, 0, 0, false]);
    expect([...m.mem]).toEqual([...p.mem]);
    expect(m.fetches.every(v => v === 0) && m.reads.every(v => v === 0) && m.writes.every(v => v === 0)).toBe(true);
  });

  it('sets the flags, wraps 8-bit sums and counts memory accesses', () => {
    const p = assemble('LDA A\nADD B\nNOT\nHLT\nA: DB 200\nB: DB 56');
    const m = new Machine();
    m.reset(p.mem);
    m.step();
    expect([m.ac, m.n, m.z]).toEqual([200, 1, 0]);
    m.step();
    expect([m.ac, m.n, m.z]).toEqual([0, 0, 1]); // 200 + 56 = 256 → 0
    m.step();
    expect(m.ac).toBe(255);
    expect(m.accesses).toBe(2 + 1 + 2 + 1 + 1);
    expect(m.lastRead).toBe(-1);
  });

  it('records manual writes so Back can undo them', () => {
    const m = new Machine();
    m.reset(new Uint8Array(256));
    m.write(0x80, -1);
    expect(m.mem[0x80]).toBe(255);
    expect(m.trace.at(-1)).toEqual({ kind: 'edit', at: 0x80, old: 0, val: 255 });
    m.back();
    expect(m.mem[0x80]).toBe(0);
    expect(m.canUndo).toBe(false);
  });

  it('runs undefined opcodes as NOP and points at the next data access', () => {
    const p = assemble('DB 70h\nLDA X\nX: DB 1');
    const m = new Machine();
    m.reset(p.mem);
    expect(m.nextDataTarget()).toBe(-1);
    const rec = m.step();
    expect(rec.kind === 'step' && rec.name).toBe(null);
    expect(m.pc).toBe(1);
    expect(m.nextDataTarget()).toBe(3);
  });
});
