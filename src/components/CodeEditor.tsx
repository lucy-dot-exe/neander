import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/features/register.all';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { useI18n } from '../i18n/context';
import { MESSAGES, type Messages } from '../i18n/messages';
import type { AsmError, Sym } from '../neander/assembler';
import { DIRECTIVES, OPS, hx, isDirective, isOp, signed, type OpInfo, type OpName } from '../neander/isa';

(globalThis as unknown as { MonacoEnvironment: object }).MonacoEnvironment = { getWorker: () => new EditorWorker() };

// Hover and completion read the latest symbols, memory and messages through this shared context.
const ctx: { sym: Map<string, Sym>; memAt: (a: number) => number; t: Messages } = { sym: new Map(), memAt: () => 0, t: MESSAGES['pt-BR'] };

let languageReady = false;
function ensureLanguage() {
  if (languageReady) return;
  languageReady = true;
  monaco.languages.register({ id: 'neander' });
  monaco.languages.setMonarchTokensProvider('neander', {
    ignoreCase: true,
    mnemonics: Object.keys(OPS),
    directives: [...DIRECTIVES],
    tokenizer: {
      root: [
        [/;.*$/, 'comment'],
        [/[A-Za-z_]\w*(?=\s*:)/, 'type.label'],
        [/0x[0-9a-fA-F]+|0b[01]+|[0-9][0-9a-fA-F]*[hH]\b|[01]+[bB]\b|\d+/, 'number'],
        [/[A-Za-z_]\w*/, { cases: { '@mnemonics': 'keyword', '@directives': 'keyword.directive', '@default': 'identifier' } }],
        [/[:,+-]/, 'delimiter']
      ]
    }
  } as monaco.languages.IMonarchLanguage);
  monaco.languages.setLanguageConfiguration('neander', { comments: { lineComment: ';' }, wordPattern: /[A-Za-z_]\w*|\d\w*/ });

  monaco.languages.registerHoverProvider('neander', {
    provideHover(model, pos) {
      const w = model.getWordAtPosition(pos);
      if (!w) return null;
      const K = w.word.toUpperCase(), t = ctx.t;
      const range = new monaco.Range(pos.lineNumber, w.startColumn, pos.lineNumber, w.endColumn);
      if (isOp(K)) {
        const op = OPS[K];
        return {
          range,
          contents: [
            { value: `**${K}** · opcode \`${hx(op.code)}\` · ${op.size} byte${op.size > 1 ? 's' : ''}` },
            { value: `\`${t.ops[K].effect}\`\n\n${t.ops[K].desc}` }
          ]
        };
      }
      if (isDirective(K)) return { range, contents: [{ value: `**${K}** · ${t.editor.directive}` }, { value: t.directives[K] }] };
      const s = ctx.sym.get(K);
      if (!s) return null;
      const lines = [`**${s.name}** = \`${hx(s.value)}\` (${s.value}) · ${s.kind === 'equ' ? t.editor.constant : t.editor.address}, ${t.editor.line(s.line)}`];
      if (s.kind === 'addr' && s.value < 256) {
        const v = ctx.memAt(s.value);
        lines.push(`${t.editor.inMemory}: \`${hx(v)}\` = ${v}${v > 127 ? ` (${signed(v)})` : ''}`);
      }
      return { range, contents: lines.map(value => ({ value })) };
    }
  });

  monaco.languages.registerCompletionItemProvider('neander', {
    provideCompletionItems(model, pos) {
      const w = model.getWordUntilPosition(pos);
      const range = new monaco.Range(pos.lineNumber, w.startColumn, pos.lineNumber, w.endColumn);
      const K = monaco.languages.CompletionItemKind, t = ctx.t;
      const suggestions: monaco.languages.CompletionItem[] = [];
      for (const [k, v] of Object.entries(OPS) as [OpName, OpInfo][])
        suggestions.push({ label: k, kind: K.Keyword, detail: t.ops[k].effect, documentation: t.ops[k].desc, insertText: v.size === 2 ? k + ' ' : k, range, sortText: '1' + k });
      for (const k of DIRECTIVES)
        suggestions.push({ label: k, kind: K.Module, detail: t.editor.directive, documentation: { value: t.directives[k] }, insertText: k + ' ', range, sortText: '2' + k });
      for (const s of ctx.sym.values())
        suggestions.push({
          label: s.name, kind: s.kind === 'equ' ? K.Constant : K.Variable, detail: `${hx(s.value)} · ${t.editor.line(s.line)}`,
          insertText: s.name, range, sortText: '0' + s.name
        });
      return { suggestions };
    }
  });

  const rules = (dark: boolean): monaco.editor.ITokenThemeRule[] =>
    dark
      ? [
          { token: 'keyword', foreground: '7F9EFF', fontStyle: 'bold' },
          { token: 'keyword.directive', foreground: 'C49BFF' },
          { token: 'type.label', foreground: 'FFC266', fontStyle: 'bold' },
          { token: 'number', foreground: '4CC9B0' },
          { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
          { token: 'identifier', foreground: 'E7E9EE' },
          { token: 'delimiter', foreground: '9399A6' }
        ]
      : [
          { token: 'keyword', foreground: '2F5BE0', fontStyle: 'bold' },
          { token: 'keyword.directive', foreground: '7A3FB5' },
          { token: 'type.label', foreground: '9A5F06', fontStyle: 'bold' },
          { token: 'number', foreground: '0F8A74' },
          { token: 'comment', foreground: '8A909C', fontStyle: 'italic' },
          { token: 'identifier', foreground: '16181D' },
          { token: 'delimiter', foreground: '6B7280' }
        ];
  monaco.editor.defineTheme('neander-light', {
    base: 'vs', inherit: true, rules: rules(false),
    colors: {
      'editor.background': '#FFFFFF', 'editorGutter.background': '#FFFFFF', 'editor.lineHighlightBackground': '#F6F7F9',
      'editor.lineHighlightBorder': '#00000000', 'editorLineNumber.foreground': '#A0A6B1', 'editorLineNumber.activeForeground': '#16181D',
      'editorCursor.foreground': '#2F5BE0', 'editor.selectionBackground': '#D6E0FB'
    }
  });
  monaco.editor.defineTheme('neander-dark', {
    base: 'vs-dark', inherit: true, rules: rules(true),
    colors: {
      'editor.background': '#111318', 'editorGutter.background': '#111318', 'editor.lineHighlightBackground': '#191C22',
      'editor.lineHighlightBorder': '#00000000', 'editorLineNumber.foreground': '#4E5562', 'editorLineNumber.activeForeground': '#E7E9EE',
      'editorCursor.foreground': '#7F9EFF', 'editor.selectionBackground': '#2A3657'
    }
  });
}

export interface CodeEditorHandle {
  goto(line: number, focus: boolean): void;
  toggleBreakpointAtCursor(): void;
}

interface Props {
  value: string;
  onChange(value: string): void;
  errors: AsmError[];
  /** Line of the instruction at PC (0 for none). */
  pcLine: number;
  revealPc: boolean;
  dark: boolean;
  sym: Map<string, Sym>;
  memAt(a: number): number;
  onBreakpointsChange(lines: number[]): void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bpRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const pcRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const { t } = useI18n();
  const propsRef = useRef(props);
  propsRef.current = props;
  ctx.sym = props.sym;
  ctx.memAt = props.memAt;
  ctx.t = t;

  const bpLines = () => [...new Set((bpRef.current?.getRanges() ?? []).map(r => r.startLineNumber))].sort((a, b) => a - b);
  const setBreakpoints = (lines: number[]) => {
    bpRef.current?.set(
      lines.map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'bp-glyph',
          glyphMarginHoverMessage: { value: ctx.t.editor.breakpoint },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }))
    );
    propsRef.current.onBreakpointsChange(bpLines());
  };
  const toggleBreakpoint = (line: number) => {
    const set = new Set(bpLines());
    if (set.has(line)) set.delete(line);
    else set.add(line);
    setBreakpoints([...set]);
  };

  useEffect(() => {
    ensureLanguage();
    const editor = monaco.editor.create(hostRef.current!, {
      value: propsRef.current.value,
      language: 'neander',
      theme: propsRef.current.dark ? 'neander-dark' : 'neander-light',
      fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace",
      fontSize: 14,
      lineHeight: 21,
      glyphMargin: true,
      lineDecorationsWidth: 14,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 8,
      insertSpaces: true,
      wordBasedSuggestions: 'off',
      fixedOverflowWidgets: true,
      padding: { top: 10 },
      overviewRulerLanes: 2
    });
    editorRef.current = editor;
    bpRef.current = editor.createDecorationsCollection([]);
    pcRef.current = editor.createDecorationsCollection([]);
    const subs = [
      editor.onDidChangeModelContent(() => {
        const v = editor.getValue();
        if (v !== propsRef.current.value) propsRef.current.onChange(v);
        propsRef.current.onBreakpointsChange(bpLines());
      }),
      editor.onMouseDown(e => {
        const T = monaco.editor.MouseTargetType;
        if ((e.target.type === T.GUTTER_GLYPH_MARGIN || e.target.type === T.GUTTER_LINE_DECORATIONS) && e.target.position)
          toggleBreakpoint(e.target.position.lineNumber);
      })
    ];
    document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
    return () => {
      subs.forEach(s => s.dispose());
      editor.getModel()?.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // created once; later prop changes are applied by the effects below
  }, []);

  // Text replaced from outside (an example, or the block editor): load it and drop breakpoints.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== props.value) {
      editor.setValue(props.value);
      setBreakpoints([]);
    }
  }, [props.value]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(
      model,
      'neander',
      props.errors
        .filter(e => e.line <= model.getLineCount())
        .map(e => ({
          severity: monaco.MarkerSeverity.Error,
          message: e.msg(t),
          startLineNumber: e.line,
          endLineNumber: e.line,
          startColumn: model.getLineFirstNonWhitespaceColumn(e.line) || 1,
          endColumn: model.getLineMaxColumn(e.line)
        }))
    );
  }, [props.errors, t]);

  useEffect(() => {
    const editor = editorRef.current, model = editor?.getModel();
    if (!editor || !model) return;
    const line = props.pcLine;
    if (!line || line > model.getLineCount()) {
      pcRef.current?.set([]);
      return;
    }
    pcRef.current?.set([{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'pc-line', linesDecorationsClassName: 'pc-arrow' } }]);
    if (props.revealPc) editor.revealLineInCenterIfOutsideViewport(line);
  }, [props.pcLine, props.revealPc]);

  // Breakpoint hovers carry text: redraw them in the new language.
  useEffect(() => {
    if (editorRef.current) setBreakpoints(bpLines());
  }, [t]);

  useEffect(() => {
    monaco.editor.setTheme(props.dark ? 'neander-dark' : 'neander-light');
  }, [props.dark]);

  useImperativeHandle(ref, () => ({
    goto(line, focus) {
      const editor = editorRef.current, model = editor?.getModel();
      if (!editor || !model) return;
      editor.revealLineInCenterIfOutsideViewport(line);
      if (focus) {
        editor.setPosition({ lineNumber: line, column: model.getLineFirstNonWhitespaceColumn(line) || 1 });
        editor.focus();
      }
    },
    toggleBreakpointAtCursor() {
      const pos = editorRef.current?.getPosition();
      if (pos) toggleBreakpoint(pos.lineNumber);
    }
  }));

  return <div ref={hostRef} className="editor" />;
});
