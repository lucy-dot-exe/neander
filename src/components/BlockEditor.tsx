import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import { TOOLBOX, blockTheme, defineBlocks } from '../blocks/definitions';
import { blocksToSource, sourceToState, type BlockLike, type Generated } from '../blocks/convert';
import { assemble, type AsmError } from '../neander/assembler';

export interface BlockEditorHandle {
  goto(line: number): void;
}

interface Props {
  /** The program text. Blocks are rebuilt whenever it changes from outside. */
  source: string;
  /** Called with the regenerated text after the blocks are edited. */
  onSourceChange(text: string): void;
  /** Called when rebuilding the blocks rewrote the text into the blocks' own layout. */
  onNormalized(text: string): void;
  onLooseChange(count: number): void;
  errors: AsmError[];
  /** Text the errors belong to; they are only shown when it matches the blocks. */
  errorsSource: string;
  pcLine: number;
  /** Text the PC line belongs to (the loaded program). */
  pcSource: string;
  dark: boolean;
}

const EMPTY: Generated = { text: '', lineBlock: [], loose: 0 };
const generate = (ws: Blockly.WorkspaceSvg) => blocksToSource(ws.getTopBlocks(true) as unknown as BlockLike[]);

export const BlockEditor = forwardRef<BlockEditorHandle, Props>(function BlockEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const genRef = useRef<Generated>(EMPTY);
  const suppress = useRef(false);
  const warned = useRef<string[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;
  // bumped after each rebuild so warnings and the PC highlight are re-applied
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    defineBlocks();
    const host = hostRef.current!;
    const ws = Blockly.inject(host, {
      toolbox: TOOLBOX,
      renderer: 'zelos',
      theme: blockTheme(propsRef.current.dark),
      trashcan: false,
      sounds: false,
      comments: true,
      zoom: { controls: false, wheel: true, startScale: 0.72, maxScale: 1.6, minScale: 0.35 },
      move: { scrollbars: true, drag: true, wheel: true }
    });
    wsRef.current = ws;
    let timer = 0;
    const sync = () => {
      const g = generate(ws);
      genRef.current = g;
      propsRef.current.onLooseChange(g.loose);
      if (g.text !== propsRef.current.source) propsRef.current.onSourceChange(g.text);
      setGeneration(n => n + 1);
    };
    ws.addChangeListener(e => {
      if (suppress.current || e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING) return;
      clearTimeout(timer);
      timer = window.setTimeout(sync, 150);
    });
    const ro = new ResizeObserver(() => Blockly.svgResize(ws));
    ro.observe(host);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      ws.dispose();
      wsRef.current = null;
      genRef.current = EMPTY;
      warned.current = [];
    };
  }, []);

  // Rebuild the blocks when the text changes from outside (entering this mode, or loading an example).
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || props.source === genRef.current.text) return;
    const { state, comments } = sourceToState(props.source, assemble(props.source).sym);
    suppress.current = true;
    Blockly.Events.disable();
    try {
      ws.clear();
      Blockly.serialization.workspaces.load(state, ws);
      for (const [id, text] of comments) ws.getBlockById(id)?.setCommentText(text);
      ws.cleanUp();
    } finally {
      Blockly.Events.enable();
      suppress.current = false;
    }
    ws.scroll(0, 0);
    warned.current = [];
    const g = generate(ws);
    genRef.current = g;
    props.onLooseChange(g.loose);
    if (g.text !== props.source) props.onNormalized(g.text);
    setGeneration(n => n + 1);
  }, [props.source]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    for (const id of warned.current) ws.getBlockById(id)?.setWarningText(null);
    warned.current = [];
    if (props.errorsSource !== genRef.current.text) return;
    for (const e of props.errors) {
      const id = genRef.current.lineBlock[e.line - 1];
      const b = id ? ws.getBlockById(id) : null;
      if (b) {
        b.setWarningText(e.msg);
        warned.current.push(b.id);
      }
    }
  }, [props.errors, props.errorsSource, generation]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const g = genRef.current;
    const id = props.pcLine && props.pcSource === g.text ? g.lineBlock[props.pcLine - 1] ?? null : null;
    ws.highlightBlock(id);
  }, [props.pcLine, props.pcSource, generation]);

  useEffect(() => {
    wsRef.current?.setTheme(blockTheme(props.dark));
  }, [props.dark]);

  useImperativeHandle(ref, () => ({
    goto(line) {
      const ws = wsRef.current;
      const id = genRef.current.lineBlock[line - 1];
      const b = id && ws ? ws.getBlockById(id) : null;
      if (ws && b) {
        b.select();
        ws.centerOnBlock(b.id);
      }
    }
  }));

  return <div ref={hostRef} className="editor blocks" />;
});
