// The Neander instruction set (Raul Weber, UFRGS): 8-bit words, 256 bytes of memory,
// one accumulator (AC), a program counter (PC) and the N and Z flags.

export type OpName = 'NOP' | 'STA' | 'LDA' | 'ADD' | 'OR' | 'AND' | 'NOT' | 'JMP' | 'JN' | 'JZ' | 'HLT';

export interface OpInfo {
  code: number;
  size: 1 | 2;
  effect: string;
  desc: string;
}

export const OPS: Record<OpName, OpInfo> = {
  NOP: { code: 0x00, size: 1, effect: 'Nenhuma operação', desc: 'Não faz nada.' },
  STA: { code: 0x10, size: 2, effect: 'MEM[end] ← AC', desc: 'Grava o acumulador na memória.' },
  LDA: { code: 0x20, size: 2, effect: 'AC ← MEM[end]', desc: 'Carrega o acumulador com um byte da memória. Atualiza N e Z.' },
  ADD: { code: 0x30, size: 2, effect: 'AC ← AC + MEM[end]', desc: 'Soma um byte da memória ao acumulador (8 bits, o vai-um se perde). Atualiza N e Z.' },
  OR: { code: 0x40, size: 2, effect: 'AC ← AC OR MEM[end]', desc: 'OU lógico bit a bit com um byte da memória. Atualiza N e Z.' },
  AND: { code: 0x50, size: 2, effect: 'AC ← AC AND MEM[end]', desc: 'E lógico bit a bit com um byte da memória. Atualiza N e Z.' },
  NOT: { code: 0x60, size: 1, effect: 'AC ← NOT AC', desc: 'Inverte todos os bits do acumulador (complemento de um). Atualiza N e Z.' },
  JMP: { code: 0x80, size: 2, effect: 'PC ← end', desc: 'Desvia para o endereço.' },
  JN: { code: 0x90, size: 2, effect: 'se N = 1: PC ← end', desc: 'Desvia se o último resultado foi negativo (bit 7 ligado).' },
  JZ: { code: 0xa0, size: 2, effect: 'se Z = 1: PC ← end', desc: 'Desvia se o último resultado foi zero.' },
  HLT: { code: 0xf0, size: 1, effect: 'Parar', desc: 'Para a máquina.' }
};

export type DirectiveName = 'ORG' | 'DB' | 'DS' | 'EQU' | 'END';

export const DIRECTIVES: Record<DirectiveName, string> = {
  ORG: 'Define o endereço onde os próximos bytes serão gravados. Exemplo: `ORG 128`',
  DB: 'Grava um ou mais bytes. Exemplo: `DB 5, -1, 0Ah`',
  DS: 'Reserva uma quantidade de bytes zerados. Exemplo: `DS 4`',
  EQU: 'Dá nome a uma constante. Exemplo: `DEZ EQU 10`',
  END: 'Encerra a montagem; as linhas seguintes são ignoradas.'
};

export const isOp = (k: string): k is OpName => Object.hasOwn(OPS, k);
export const isDirective = (k: string): k is DirectiveName => Object.hasOwn(DIRECTIVES, k);

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
