import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import * as PtBr from 'blockly/msg/pt-br';
import type { Lang, Messages } from '../i18n/messages';
import type { OpName } from '../neander/isa';

const OP_STYLES: [OpName, string][] = [
  ['LDA', 'memory'],
  ['STA', 'memory'],
  ['ADD', 'math'],
  ['NOT', 'math'],
  ['AND', 'math'],
  ['OR', 'math'],
  ['JMP', 'control'],
  ['JZ', 'control'],
  ['JN', 'control'],
  ['NOP', 'control'],
  ['HLT', 'control']
];

const mn = (t: string) => ({ type: 'field_label', text: t, class: 'blk-mn' });
const stmt = { previousStatement: null, nextStatement: null };

/** Block JSON in the given language, keyed by block type. Each block maps to one line of assembly. */
function blockDefs(t: Messages): Record<string, object> {
  const b = t.blocks;
  const defs: Record<string, object> = {
    n_start: {
      message0: b.start,
      args0: [{ type: 'field_number', name: 'ADDR', value: 0, min: 0, max: 255, precision: 1 }],
      nextStatement: null, style: 'start_blocks', tooltip: b.startTip
    },
    n_label: {
      message0: b.label, args0: [{ type: 'field_input', name: 'NAME', text: b.labelDefault }],
      ...stmt, style: 'label_blocks', tooltip: b.labelTip
    },
    n_db: {
      message0: b.db,
      args0: [mn('DB'), { type: 'field_input', name: 'NAME', text: 'X' }, { type: 'field_input', name: 'VALUE', text: '0' }],
      ...stmt, style: 'data_blocks', tooltip: b.dbTip
    },
    n_ds: {
      message0: b.ds,
      args0: [mn('DS'), { type: 'field_input', name: 'SIZE', text: '1' }, { type: 'field_input', name: 'NAME', text: 'BUF' }],
      ...stmt, style: 'data_blocks', tooltip: b.dsTip
    },
    n_equ: {
      message0: b.equ,
      args0: [mn('EQU'), { type: 'field_input', name: 'NAME', text: b.equDefault }, { type: 'field_input', name: 'VALUE', text: '10' }],
      ...stmt, style: 'data_blocks', tooltip: b.equTip
    },
    n_note: {
      message0: b.note, args0: [{ type: 'field_input', name: 'TEXT', text: b.noteDefault }],
      ...stmt, style: 'note_blocks', tooltip: b.noteTip
    }
  };
  for (const [op, style] of OP_STYLES) {
    const [text, def] = b.ops[op];
    defs['n_' + op.toLowerCase()] = {
      message0: '%1 ' + (def ? text : text.replace('%2', '')),
      args0: def ? [mn(op), { type: 'field_input', name: 'ADDR', text: def }] : [mn(op)],
      ...stmt,
      style: style + '_blocks',
      tooltip: `${op}: ${t.ops[op].effect}. ${t.ops[op].desc}`
    };
  }
  return defs;
}

let current: Record<string, object> = {};

/**
 * Puts Blockly and the Neander blocks in the given language. Blocks read their text when they
 * are created, so only blocks made after this call change; the editor is rebuilt to apply it.
 */
export function setBlockLanguage(lang: Lang, t: Messages) {
  Blockly.setLocale((lang === 'en' ? En : PtBr) as unknown as Record<string, string>);
  current = blockDefs(t);
  for (const type of Object.keys(current)) {
    Blockly.Blocks[type] ??= {
      init(this: Blockly.Block) {
        this.jsonInit(current[type]);
      }
    };
  }
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

export const toolbox = (t: Messages) => {
  const c = t.blocks.categories;
  return {
    kind: 'categoryToolbox',
    contents: [
      { kind: 'category', name: c.start, categorystyle: 'start_category', contents: [block('n_start', { ADDR: 0 }), block('n_start', { ADDR: 128 })] },
      { kind: 'category', name: c.memory, categorystyle: 'memory_category', contents: [block('n_lda'), block('n_sta')] },
      { kind: 'category', name: c.math, categorystyle: 'math_category', contents: [block('n_add'), block('n_not'), block('n_and'), block('n_or')] },
      {
        kind: 'category', name: c.jumps, categorystyle: 'jump_category',
        contents: [block('n_label'), block('n_jmp'), block('n_jz'), block('n_jn'), block('n_nop'), block('n_hlt')]
      },
      { kind: 'category', name: c.data, categorystyle: 'data_category', contents: [block('n_db'), block('n_ds'), block('n_equ')] },
      { kind: 'category', name: c.notes, categorystyle: 'note_category', contents: [block('n_note')] }
    ]
  };
};
