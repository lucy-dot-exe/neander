import { describe, expect, it } from 'vitest';
import { assemble, sameImage } from '../neander/assembler';
import { EXAMPLES } from '../neander/examples';
import { blocksToSource, sourceToState, type BlockLike, type BlockState } from './convert';

// Minimal stand-in for Blockly blocks built from serialized state.
function toBlocks(states: BlockState[], comments: Map<string, string>): BlockLike[] {
  const wrap = (s: BlockState): BlockLike => ({
    type: s.type,
    id: s.id,
    getFieldValue: k => s.fields[k],
    getCommentText: () => comments.get(s.id) ?? null,
    getNextBlock: () => (s.next ? wrap(s.next.block) : null)
  });
  return states.map(wrap);
}

describe('blocks ⇄ source', () => {
  it.each(EXAMPLES.map(e => [e.id, e] as const))('round-trips the %s example to the same memory image', (_id, ex) => {
    const original = assemble(ex.src);
    const { state, comments } = sourceToState(ex.src, original.sym);
    const gen = blocksToSource(toBlocks(state.blocks.blocks, comments));
    const again = assemble(gen.text);
    expect(again.errors).toEqual([]);
    expect(sameImage(again, original)).toBe(true);
    expect(gen.loose).toBe(0);
  });

  it('keeps comments, merges labels into the next line and maps lines to blocks', () => {
    const src = '; topo\n        ORG 0\nLACO:\n        JMP LACO   ; para sempre\n';
    const { state, comments } = sourceToState(src, assemble(src).sym);
    const gen = blocksToSource(toBlocks(state.blocks.blocks, comments));
    expect(gen.text).toBe('        ORG 0\n        ; topo\nLACO:   JMP LACO        ; para sempre\n');
    const jmp = gen.lineBlock[2];
    expect(jmp).not.toBeNull();
  });

  it('counts blocks outside an "at address" stack as loose', () => {
    const loose: BlockLike = { type: 'n_hlt', id: 'a', getFieldValue: () => '', getCommentText: () => null, getNextBlock: () => null };
    expect(blocksToSource([loose]).loose).toBe(1);
  });
});
