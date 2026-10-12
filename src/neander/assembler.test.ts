import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { assemble, evalExpr, parseNum } from './assembler';

const pt = MESSAGES['pt-BR'], en = MESSAGES.en;

describe('parseNum', () => {
  it.each([
    ['12', 12],
    ['0Ch', 12],
    ['0x0C', 12],
    ['1100b', 12],
    ['0b1100', 12],
    ['FFh', null], // hex with an h suffix must start with a digit
    ['X', null]
  ])('%s → %s', (t, v) => expect(parseNum(t)).toBe(v));
});

describe('evalExpr', () => {
  const sym = new Map([['GET', { name: 'GET', value: 10, kind: 'addr' as const, line: 1 }]]);
  it('adds and subtracts numbers and labels', () => {
    expect(evalExpr('GET+1', sym)).toEqual({ v: 11 });
    expect(evalExpr('get - 2 + 0Ah', sym)).toEqual({ v: 18 });
    expect(evalExpr('-1', sym)).toEqual({ v: -1 });
  });
  it('reports unknown labels and dangling operators', () => {
    expect(evalExpr('Q', sym).err?.(pt)).toBe('Rótulo "Q" não definido');
    expect(evalExpr('1+', sym).err?.(pt)).toBe('O valor termina com um operador');
    expect(evalExpr('Q', sym).err?.(en)).toBe('Label "Q" is not defined');
  });
});

describe('assemble', () => {
  it('places code and data and records labels', () => {
    const p = assemble(`        ORG 0
        LDA X
        ADD Y
        STA R
        HLT
        ORG 128
X:      DB 25
Y:      DB 17
R:      DB 0
`);
    expect(p.errors).toEqual([]);
    expect([...p.mem.slice(0, 7)]).toEqual([0x20, 0x80, 0x30, 0x81, 0x10, 0x82, 0xf0]);
    expect([...p.mem.slice(0x80, 0x83)]).toEqual([25, 17, 0]);
    expect(p.role.slice(0, 3)).toEqual(['op', 'arg', 'op']);
    expect(p.labelAt[0x80]).toBe('X');
    expect(p.lineOf[0]).toBe(2);
    expect(p.lineAddr.get(7)).toBe(0x80);
    expect(p.bytes).toBe(10);
  });

  it('supports EQU, DS, DB lists, negative bytes and END', () => {
    const p = assemble(`DEZ EQU 10
        ORG DEZ
T:      DB 1, -1, 0Ah
BUF:    DS 2
        END
        HLT`);
    expect(p.errors).toEqual([]);
    expect([...p.mem.slice(10, 15)]).toEqual([1, 255, 10, 0, 0]);
    expect(p.role[13]).toBe('res');
    expect(p.sym.get('DEZ')).toMatchObject({ value: 10, kind: 'equ' });
    expect(p.mem[15]).toBe(0); // HLT after END is ignored
  });

  it('reports each kind of mistake on its line', () => {
    const p = assemble(`X: LDA
FOO 3
LDA Q
ORG 300
DB 999
X: NOT 4
 ORG 255
LDA 1`);
    expect(p.errors.map(e => [e.line, e.msg(pt)])).toEqual([
      [1, 'LDA precisa de um endereço, como em LDA X'],
      [2, 'Instrução "FOO" desconhecida'],
      [3, 'Rótulo "Q" não definido'],
      [4, 'ORG 300 está fora da memória (0 a 255)'],
      [5, '999 não cabe em um byte (-128 a 255)'],
      [6, 'O rótulo "X" já foi definido na linha 1'],
      [6, 'NOT não recebe operando'],
      [8, 'O programa passa do último endereço, FFh (255)']
    ]);
    expect(p.errors.map(e => e.msg(en))).toContain('Label "X" was already defined on line 1');
  });

  it('rejects overlapping bytes and instruction names used as labels', () => {
    expect(assemble('ORG 0\nDB 1\nORG 0\nDB 2').errors[0].msg(pt)).toBe('O endereço 00h já é usado pela linha 2');
    expect(assemble('ADD: HLT').errors[0].msg(pt)).toBe('"ADD" é nome de instrução e não pode ser usado como rótulo');
    expect(assemble('constructor: HLT').errors).toEqual([]);
  });
});
