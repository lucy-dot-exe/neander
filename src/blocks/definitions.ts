import * as Blockly from 'blockly/core';
import * as PtBr from 'blockly/msg/pt-br';
import { OPS, type OpName } from '../neander/isa';

Blockly.setLocale(PtBr as unknown as Record<string, string>);

const OP_BLOCKS: [OpName, string, string, string?][] = [
  ['LDA', 'carregar AC com %2', 'memory', 'X'],
  ['STA', 'guardar AC em %2', 'memory', 'R'],
  ['ADD', 'somar %2 ao AC', 'math', 'Y'],
  ['NOT', 'inverter todos os bits do AC', 'math'],
  ['AND', 'E lógico do AC com %2', 'math', 'MASCARA'],
  ['OR', 'OU lógico do AC com %2', 'math', 'MASCARA'],
  ['JMP', 'desviar para %2', 'control', 'LACO'],
  ['JZ', 'se zero, desviar para %2', 'control', 'FIM'],
  ['JN', 'se negativo, desviar para %2', 'control', 'LACO'],
  ['NOP', 'não fazer nada', 'control'],
  ['HLT', 'parar a máquina', 'control']
];

let defined = false;

/** Registers the Neander block types once. Each block maps to one line of assembly. */
export function defineBlocks() {
  if (defined) return;
  defined = true;
  const mn = (t: string) => ({ type: 'field_label', text: t, class: 'blk-mn' });
  const stmt = { previousStatement: null, nextStatement: null };
  const defs: object[] = [
    {
      type: 'n_start', message0: 'no endereço %1',
      args0: [{ type: 'field_number', name: 'ADDR', value: 0, min: 0, max: 255, precision: 1 }],
      nextStatement: null, style: 'start_blocks',
      tooltip: 'Tudo o que for encaixado embaixo vai para a memória a partir deste endereço (ORG).'
    },
    {
      type: 'n_label', message0: 'rótulo %1', args0: [{ type: 'field_input', name: 'NAME', text: 'LACO' }],
      ...stmt, style: 'label_blocks', tooltip: 'Dá nome ao endereço do próximo bloco, para ser usado em desvios e cargas.'
    },
    {
      type: 'n_db', message0: '%1 byte %2 = %3',
      args0: [mn('DB'), { type: 'field_input', name: 'NAME', text: 'X' }, { type: 'field_input', name: 'VALUE', text: '0' }],
      ...stmt, style: 'data_blocks', tooltip: 'Grava bytes na memória (DB). Separe vários valores com vírgulas. O nome é opcional.'
    },
    {
      type: 'n_ds', message0: '%1 reservar %2 bytes com o nome %3',
      args0: [mn('DS'), { type: 'field_input', name: 'SIZE', text: '1' }, { type: 'field_input', name: 'NAME', text: 'BUF' }],
      ...stmt, style: 'data_blocks', tooltip: 'Reserva bytes zerados (DS).'
    },
    {
      type: 'n_equ', message0: '%1 constante %2 = %3',
      args0: [mn('EQU'), { type: 'field_input', name: 'NAME', text: 'DEZ' }, { type: 'field_input', name: 'VALUE', text: '10' }],
      ...stmt, style: 'data_blocks', tooltip: 'Dá nome a um número sem usar memória (EQU).'
    },
    {
      type: 'n_note', message0: 'nota %1', args0: [{ type: 'field_input', name: 'TEXT', text: 'o que esta parte faz' }],
      ...stmt, style: 'note_blocks', tooltip: 'Um comentário. Não vai para a memória.'
    }
  ];
  for (const [op, text, style, def] of OP_BLOCKS) {
    defs.push({
      type: 'n_' + op.toLowerCase(),
      message0: '%1 ' + (def ? text : text.replace('%2', '')),
      args0: def ? [mn(op), { type: 'field_input', name: 'ADDR', text: def }] : [mn(op)],
      ...stmt,
      style: style + '_blocks',
      tooltip: `${op}: ${OPS[op].effect}. ${OPS[op].desc}`
    });
  }
  Blockly.defineBlocksWithJsonArray(defs);
}

const makeTheme = (dark: boolean) =>
  Blockly.Theme.defineTheme(dark ? 'neander-dark' : 'neander-light', {
    name: dark ? 'neander-dark' : 'neander-light',
    base: Blockly.Themes.Classic,
    blockStyles: {
      start_blocks: { colourPrimary: '#D4961C', colourSecondary: '#E6B655', colourTertiary: '#A87412', hat: 'cap' },
      memory_blocks: { colourPrimary: '#3D72D6', colourSecondary: '#6E95E2', colourTertiary: '#2A55A8', hat: '' },
      math_blocks: { colourPrimary: '#36955A', colourSecondary: '#64B381', colourTertiary: '#25723F', hat: '' },
      control_blocks: { colourPrimary: '#DB7429', colourSecondary: '#E8995E', colourTertiary: '#AE5617', hat: '' },
      label_blocks: { colourPrimary: '#8A5AD2', colourSecondary: '#A985E0', colourTertiary: '#6A3FB0', hat: '' },
      data_blocks: { colourPrimary: '#D04A5A', colourSecondary: '#DE7884', colourTertiary: '#A93342', hat: '' },
      note_blocks: { colourPrimary: '#77818F', colourSecondary: '#979FAB', colourTertiary: '#5B6470', hat: '' }
    },
    categoryStyles: {
      start_category: { colour: '#D4961C' },
      memory_category: { colour: '#3D72D6' },
      math_category: { colour: '#36955A' },
      jump_category: { colour: '#DB7429' },
      data_category: { colour: '#D04A5A' },
      note_category: { colour: '#77818F' }
    },
    componentStyles: {
      workspaceBackgroundColour: dark ? '#111318' : '#FFFFFF',
      toolboxBackgroundColour: dark ? '#191C22' : '#F6F7F9',
      toolboxForegroundColour: dark ? '#E7E9EE' : '#16181D',
      flyoutBackgroundColour: dark ? '#1F232A' : '#EEF0F3',
      flyoutForegroundColour: dark ? '#E7E9EE' : '#16181D',
      flyoutOpacity: 0.97,
      scrollbarColour: dark ? '#3A4250' : '#C9CED6',
      scrollbarOpacity: 0.8,
      insertionMarkerColour: dark ? '#FFFFFF' : '#000000',
      insertionMarkerOpacity: 0.25,
      cursorColour: dark ? '#7F9EFF' : '#2F5BE0'
    },
    fontStyle: { family: "'Figtree', system-ui, sans-serif", weight: '600', size: 12 },
    startHats: true
  });

let themes: { light: Blockly.Theme; dark: Blockly.Theme } | null = null;
export function blockTheme(dark: boolean) {
  themes ??= { light: makeTheme(false), dark: makeTheme(true) };
  return dark ? themes.dark : themes.light;
}

const block = (type: string, fields?: Record<string, number>) => ({ kind: 'block', type, ...(fields ? { fields } : {}) });

export const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: 'Início', categorystyle: 'start_category', contents: [block('n_start', { ADDR: 0 }), block('n_start', { ADDR: 128 })] },
    { kind: 'category', name: 'Memória', categorystyle: 'memory_category', contents: [block('n_lda'), block('n_sta')] },
    { kind: 'category', name: 'Aritmética e lógica', categorystyle: 'math_category', contents: [block('n_add'), block('n_not'), block('n_and'), block('n_or')] },
    {
      kind: 'category', name: 'Desvios', categorystyle: 'jump_category',
      contents: [block('n_label'), block('n_jmp'), block('n_jz'), block('n_jn'), block('n_nop'), block('n_hlt')]
    },
    { kind: 'category', name: 'Dados', categorystyle: 'data_category', contents: [block('n_db'), block('n_ds'), block('n_equ')] },
    { kind: 'category', name: 'Notas', categorystyle: 'note_category', contents: [block('n_note')] }
  ]
};
