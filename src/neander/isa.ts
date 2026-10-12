// The Neander instruction set (Raul Weber, UFRGS): 8-bit words, 256 bytes of memory,
// one accumulator (AC), a program counter (PC) and the N and Z flags.

export type OpName = 'NOP' | 'STA' | 'LDA' | 'ADD' | 'OR' | 'AND' | 'NOT' | 'JMP' | 'JN' | 'JZ' | 'HLT';

export interface OpInfo {
  code: number;
  size: 1 | 2;
}

// Effects and descriptions are in src/i18n/messages.tsx.
export const OPS: Record<OpName, OpInfo> = {
  NOP: { code: 0x00, size: 1 },
  STA: { code: 0x10, size: 2 },
  LDA: { code: 0x20, size: 2 },
  ADD: { code: 0x30, size: 2 },
  OR: { code: 0x40, size: 2 },
  AND: { code: 0x50, size: 2 },
  NOT: { code: 0x60, size: 1 },
  JMP: { code: 0x80, size: 2 },
  JN: { code: 0x90, size: 2 },
  JZ: { code: 0xa0, size: 2 },
  HLT: { code: 0xf0, size: 1 }
};

export type DirectiveName = 'ORG' | 'DB' | 'DS' | 'EQU' | 'END';
export const DIRECTIVES: readonly DirectiveName[] = ['ORG', 'DB', 'DS', 'EQU', 'END'];

export const isOp = (k: string): k is OpName => Object.hasOwn(OPS, k);
export const isDirective = (k: string): k is DirectiveName => (DIRECTIVES as readonly string[]).includes(k);

// The opcode lives in the high nibble; the low nibble is ignored, as on the real machine.
const BY_NIBBLE = new Map<number, OpName>();
for (const [name, info] of Object.entries(OPS) as [OpName, OpInfo][]) BY_NIBBLE.set(info.code >> 4, name);

/** The instruction a byte decodes to, or null for the undefined opcodes (which run as NOP). */
export const opOf = (byte: number): OpName | null => BY_NIBBLE.get((byte & 255) >> 4) ?? null;

/** Instructions that read or write a data byte at their operand address. */
export const DATA_OPS: ReadonlySet<OpName> = new Set<OpName>(['STA', 'LDA', 'ADD', 'OR', 'AND']);

export const h2 = (v: number) => (v & 255).toString(16).toUpperCase().padStart(2, '0');
export const hx = (v: number) => h2(v) + 'h';
export const signed = (v: number) => (v & 128 ? (v & 255) - 256 : v & 255);
export const bin = (v: number) => {
  const s = (v & 255).toString(2).padStart(8, '0');
  return s.slice(0, 4) + ' ' + s.slice(4);
};
