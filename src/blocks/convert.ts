// Converts between assembly text and Blockly's block tree. Kept free of Blockly imports
// so it can be tested on its own: the block side is described by the BlockLike interface.
import { evalExpr, type Sym } from '../neander/assembler';
import { OPS, isOp } from '../neander/isa';

export interface BlockState {
  type: string;
  id: string;
  fields: Record<string, string | number>;
  x?: number;
  y?: number;
  next?: { block: BlockState };
}

export interface WorkspaceState {
  state: { blocks: { languageVersion: 0; blocks: BlockState[] } };
  /** Inline comments to attach to blocks after loading, by block id. */
  comments: Map<string, string>;
}

/** The parts of a Blockly block the generator reads. */
export interface BlockLike {
  type: string;
  id: string;
  getFieldValue(name: string): unknown;
  getCommentText(): string | null;
  getNextBlock(): BlockLike | null;
}

export interface Generated {
  text: string;
  /** Block id behind each generated line (index = line - 1); null for blank lines. */
  lineBlock: (string | null)[];
  /** Blocks not attached under an "at address" block; they are left out of the program. */
  loose: number;
}

/** Assembly text → workspace state. Only called on text that assembles without errors. */
export function sourceToState(src: string, sym: Map<string, Sym>): WorkspaceState {
  type Stack = { top: BlockState; chain: BlockState[] };
  const stacks: Stack[] = [], pre: BlockState[] = [];
  const comments = new Map<string, string>();
  let cur: Stack | null = null, n = 0;
  const nb = (type: string, fields: BlockState['fields'], comment?: string): BlockState => {
    const b = { type, id: 'nb' + ++n, fields };
    if (comment) comments.set(b.id, comment);
    return b;
  };
  const ensure = (): Stack => {
    if (!cur) {
      cur = { top: nb('n_start', { ADDR: 0 }), chain: pre.splice(0) };
      stacks.push(cur);
    }
    return cur;
  };
  const add = (b: BlockState) => ensure().chain.push(b);

  for (const raw of src.split(/\r?\n/)) {
    let text = raw, comment = '';
    const sc = text.indexOf(';');
    if (sc >= 0) {
      comment = text.slice(sc + 1).trim();
      text = text.slice(0, sc);
    }
    let label: string | null = null;
    const lm = text.match(/^\s*([A-Za-z_]\w*)\s*:/);
    if (lm) {
      label = lm[1];
      text = text.slice(lm[0].length);
    }
    text = text.trim();
    if (!text && !label) {
      if (comment) {
        const b = nb('n_note', { TEXT: comment });
        if (cur) (cur as Stack).chain.push(b);
        else pre.push(b);
      }
      continue;
    }
    const eq = !label && text.match(/^([A-Za-z_]\w*)\s+EQU\b\s*(.*)$/i);
    if (eq) {
      add(nb('n_equ', { NAME: eq[1], VALUE: eq[2].trim() }, comment));
      continue;
    }
    const om = text.match(/^([A-Za-z_]\w*)\b\s*(.*)$/);
    const mn = om ? om[1].toUpperCase() : '', args = om ? om[2].trim() : '';
    if (mn === 'END') break;
    if (mn === 'ORG') {
      const r = evalExpr(args, sym);
      const stack: Stack = { top: nb('n_start', { ADDR: r.err !== undefined ? 0 : r.v }, comment), chain: pre.splice(0) };
      stacks.push(stack);
      cur = stack;
      if (label) stack.chain.push(nb('n_label', { NAME: label }));
      continue;
    }
    if (mn === 'DB') {
      add(nb('n_db', { NAME: label || '', VALUE: args }, comment));
      continue;
    }
    if (mn === 'DS') {
      add(nb('n_ds', { SIZE: args, NAME: label || '' }, comment));
      continue;
    }
    if (label) add(nb('n_label', { NAME: label }, mn ? '' : comment));
    if (mn && isOp(mn)) add(nb('n_' + mn.toLowerCase(), OPS[mn].size === 2 ? { ADDR: args } : {}, comment));
  }
  if (pre.length) ensure();

  const nest = (list: BlockState[]) => {
    for (let i = list.length - 2; i >= 0; i--) list[i].next = { block: list[i + 1] };
    return list[0];
  };
  const blocks = stacks.map((st, i) => {
    const top = st.top;
    top.x = 24;
    top.y = 24 + i * 40;
    if (st.chain.length) top.next = { block: nest(st.chain) };
    return top;
  });
  return { state: { blocks: { languageVersion: 0, blocks } }, comments };
}

/** Top-level blocks (ordered top to bottom) → assembly text, plus the block behind each line. */
export function blocksToSource(tops: BlockLike[]): Generated {
  const lines: string[] = [], lineBlock: (string | null)[] = [];
  let loose = 0;
  const clean = (v: unknown) => String(v ?? '').replace(/[;\r\n]/g, ' ').trim();
  const push = (t: string, id: string | null) => {
    lines.push(t);
    lineBlock.push(id);
  };
  const withNote = (t: string, b: BlockLike) => {
    const c = b.getCommentText();
    return c ? `${t.padEnd(24)}; ${clean(c)}` : t;
  };

  for (const top of tops) {
    if (top.type !== 'n_start') {
      for (let b: BlockLike | null = top; b; b = b.getNextBlock()) loose++;
      continue;
    }
    if (lines.length) push('', null);
    push(withNote(`        ORG ${clean(top.getFieldValue('ADDR'))}`, top), top.id);
    let pending: { name: string; id: string } | null = null;
    const flush = () => {
      if (pending) push(`${pending.name}:`, pending.id);
      pending = null;
    };
    const emit = (body: string, b: BlockLike) => {
      const lead = pending ? `${pending.name}:`.padEnd(7) + ' ' : '        ';
      push(withNote(lead + body, b), b.id);
      pending = null;
    };
    for (let b = top.getNextBlock(); b; b = b.getNextBlock()) {
      const f = (k: string) => clean(b!.getFieldValue(k));
      switch (b.type) {
        case 'n_label':
          flush();
          pending = { name: f('NAME'), id: b.id };
          break;
        case 'n_note':
          flush();
          push(`        ; ${f('TEXT')}`, b.id);
          break;
        case 'n_equ':
          flush();
          push(withNote(`${f('NAME').padEnd(7)} EQU ${f('VALUE')}`, b), b.id);
          break;
        case 'n_db':
        case 'n_ds': {
          const name = f('NAME');
          if (name) {
            flush();
            pending = { name, id: b.id };
          }
          emit(b.type === 'n_db' ? `DB ${f('VALUE')}` : `DS ${f('SIZE')}`, b);
          break;
        }
        case 'n_start':
          break;
        default: {
          const op = b.type.slice(2).toUpperCase();
          if (isOp(op)) emit(OPS[op].size === 2 ? `${op.padEnd(3)} ${f('ADDR')}` : op, b);
        }
      }
    }
    flush();
  }
  return { text: lines.join('\n') + '\n', lineBlock, loose };
}
