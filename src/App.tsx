import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddressDetail } from './components/AddressDetail';
import { BlockEditor, type BlockEditorHandle } from './components/BlockEditor';
import { CodeEditor, type CodeEditorHandle } from './components/CodeEditor';
import { HistoryPanel } from './components/HistoryPanel';
import { IsaPanel } from './components/IsaPanel';
import { MemoryTable } from './components/MemoryTable';
import { NextInstruction, Registers } from './components/Registers';
import { Segmented } from './components/Segmented';
import { TopBar } from './components/TopBar';
import { ViewMenu } from './components/ViewMenu';
import { useDarkMode } from './hooks/useDarkMode';
import { useSimulator, type Speed } from './hooks/useSimulator';
import { isBoolean, isString, oneOf, useStoredState } from './hooks/useStoredState';
import { assemble } from './neander/assembler';
import { EXAMPLES } from './neander/examples';
import { describeNext, makeView, type DisplayFormat } from './neander/format';

type Mode = 'code' | 'blocks';
type Tab = 'mem' | 'hist' | 'isa';

const isBase = oneOf('hex', 'dec', 'bin');
const isFormat = (v: unknown): v is DisplayFormat =>
  typeof v === 'object' && v !== null && isBase((v as DisplayFormat).addr) && isBase((v as DisplayFormat).val);

const TABS: { id: Tab; label: string }[] = [
  { id: 'mem', label: 'Memória' },
  { id: 'hist', label: 'Histórico' },
  { id: 'isa', label: 'Instruções' }
];

export default function App() {
  const dark = useDarkMode();
  const [source, setSource] = useStoredState('neander-source', EXAMPLES[0].src, isString);
  const [mode, setMode] = useStoredState<Mode>('neander-mode', 'code', oneOf('code', 'blocks'));
  const [fmt, setFmt] = useStoredState<DisplayFormat>('neander-format', { addr: 'hex', val: 'hex' }, isFormat);
  const [tab, setTab] = useStoredState<Tab>('neander-tab', 'mem', oneOf('mem', 'hist', 'isa'));
  const [followPc, setFollowPc] = useStoredState('neander-follow-pc', true, isBoolean);
  const [hideUnused, setHideUnused] = useStoredState('neander-hide-unused', false, isBoolean);
  const [speed, setSpeed] = useStoredState<Speed>('neander-speed', '8', oneOf('2', '8', '30', '200', 'max'));
  const [selected, setSelected] = useState<number | null>(null);
  const [bpLines, setBpLines] = useState<number[]>([]);
  const [loose, setLoose] = useState(0);
  const codeRef = useRef<CodeEditorHandle>(null);
  const blocksRef = useRef<BlockEditorHandle>(null);

  const sim = useSimulator(source);
  const { machine, program } = sim;
  const live = useMemo(() => assemble(source), [source]);
  const view = useMemo(() => makeView(fmt, program), [fmt, program]);
  const dirty = source !== program.source;

  const latest = useRef({ source, program });
  latest.current = { source, program };

  const { setSpeed: applySpeed, setBreakpoints, adopt } = sim;
  useEffect(() => applySpeed(speed), [applySpeed, speed]);

  // Blocks can only be built from code that assembles; fall back to code for a broken saved draft.
  useEffect(() => {
    if (mode === 'blocks' && live.errors.length) setMode('code');
    // only on start-up, so the effect has no dependencies
  }, []);

  const breakpoints = useMemo(() => {
    const addrs = new Set<number>();
    if (mode !== 'code') return addrs;
    for (const line of bpLines) {
      const a = program.lineAddr.get(line);
      if (a !== undefined && program.role[a] === 'op') addrs.add(a);
    }
    return addrs;
  }, [bpLines, program, mode]);
  useEffect(() => setBreakpoints(breakpoints), [setBreakpoints, breakpoints]);

  const goto = (line: number, focus = true) => {
    if (mode === 'blocks') blocksRef.current?.goto(line);
    else codeRef.current?.goto(line, focus);
  };

  const assembleAndLoad = () => {
    const r = sim.load(source);
    if (r.errors.length) goto(r.errors[0].line, false);
  };

  const loadExample = (id: string) => {
    const ex = EXAMPLES.find(e => e.id === id);
    if (!ex) return;
    setSource(ex.src);
    sim.load(ex.src);
    setSelected(null);
    sim.setStatus({ kind: '', text: `Exemplo carregado: ${ex.name}` });
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    if (m === 'blocks' && live.errors.length) {
      sim.setStatus({ kind: 'error', text: 'Corrija os problemas no código antes de mudar para blocos' });
      return;
    }
    setLoose(0);
    setMode(m);
  };

  // The block editor rewrote the text in its own layout: keep the loaded program if the bytes didn't change.
  const onNormalized = useCallback(
    (text: string) => {
      const wasLoaded = latest.current.source === latest.current.program.source;
      setSource(text);
      if (wasLoaded) adopt(text);
    },
    [setSource, adopt]
  );

  const onSelect = useCallback((a: number) => setSelected(a), []);

  // Keyboard shortcuts work everywhere, including inside the editor.
  const keys = useRef({ assembleAndLoad, step: sim.step, back: sim.back, toggleRun: sim.toggleRun, mode });
  keys.current = { assembleAndLoad, step: sim.step, back: sim.back, toggleRun: sim.toggleRun, mode };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      let handled = true;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') k.assembleAndLoad();
      else if (e.key === 'F10') (e.shiftKey ? k.back : k.step)();
      else if (e.key === 'F5') k.toggleRun();
      else if (e.key === 'F9' && k.mode === 'code') codeRef.current?.toggleBreakpointAtCursor();
      else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const pcLine = machine.halted && machine.trace.length ? 0 : program.role[machine.pc] ? program.lineOf[machine.pc] : 0;
  const [nextIns, nextWhat] = describeNext(machine, view);
  const showProblems = live.errors.length > 0 || (mode === 'blocks' && loose > 0);

  return (
    <>
      <TopBar
        status={sim.status}
        running={sim.running}
        canBack={machine.canUndo}
        speed={speed}
        onSpeed={setSpeed}
        onAssemble={assembleAndLoad}
        onBack={sim.back}
        onStep={sim.step}
        onToggleRun={sim.toggleRun}
        onReset={sim.reset}
      />
      <main className="app">
        <section className="card program" aria-label="Programa">
          <div className="card-head">
            <div className="head-left">
              <Segmented
                label="Editor"
                value={mode}
                onChange={switchMode}
                options={[
                  { value: 'code', label: 'Código' },
                  { value: 'blocks', label: 'Blocos' }
                ]}
              />
              {dirty && <span className="chip paused">Não montado</span>}
              {!live.errors.length && <span className="asm-info">{live.bytes} bytes · {live.sym.size} rótulos</span>}
            </div>
            <select className="select" aria-label="Carregar um programa de exemplo" value="" onChange={e => loadExample(e.target.value)}>
              <option value="">Exemplos</option>
              {EXAMPLES.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>

          <div className="editor-slot" hidden={mode !== 'code'}>
            <CodeEditor
              ref={codeRef}
              value={source}
              onChange={setSource}
              errors={live.errors}
              pcLine={pcLine}
              revealPc={!(sim.running && speed === 'max')}
              dark={dark}
              sym={live.sym}
              memAt={a => machine.mem[a]}
              onBreakpointsChange={setBpLines}
            />
          </div>
          {mode === 'blocks' && (
            <div className="editor-slot">
              <BlockEditor
                ref={blocksRef}
                source={source}
                onSourceChange={setSource}
                onNormalized={onNormalized}
                onLooseChange={setLoose}
                errors={live.errors}
                errorsSource={live.source}
                pcLine={pcLine}
                pcSource={program.source}
                dark={dark}
              />
            </div>
          )}

          {showProblems && (
            <div className="problems" aria-live="polite">
              {live.errors.length > 0 && (
                <>
                  <span className="err">{live.errors.length} problema{live.errors.length > 1 ? 's' : ''}</span>
                  {live.errors.slice(0, 3).map((e, i) => (
                    <button key={i} type="button" onClick={() => goto(e.line)}>
                      <b>Linha {e.line}</b>
                      {e.msg}
                    </button>
                  ))}
                  {live.errors.length > 3 && <span className="muted">e mais {live.errors.length - 3}</span>}
                </>
              )}
              {mode === 'blocks' && loose > 0 && (
                <span className="muted">
                  {loose} bloco{loose > 1 ? 's' : ''} solto{loose > 1 ? 's' : ''} ignorado{loose > 1 ? 's' : ''} · encaixe embaixo de um bloco "no endereço"
                </span>
              )}
            </div>
          )}
        </section>

        <section className="machine" aria-label="Máquina">
          <Registers machine={machine} view={view} />
          <NextInstruction machine={machine} ins={nextIns} what={nextWhat} view={view} />

          <div className="card tabs">
            <div className="tablist" role="tablist" aria-label="Painéis">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-controls={`panel-${t.id}`}
                  aria-selected={tab === t.id}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={e => {
                    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                    if (!d) return;
                    const next = TABS[(i + d + TABS.length) % TABS.length];
                    setTab(next.id);
                    document.getElementById(`tab-${next.id}`)?.focus();
                  }}
                >
                  {t.label}
                </button>
              ))}
              {tab === 'mem' && (
                <div className="tab-tools">
                  <ViewMenu
                    fmt={fmt}
                    onFmt={setFmt}
                    followPc={followPc}
                    onFollowPc={setFollowPc}
                    hideUnused={hideUnused}
                    onHideUnused={setHideUnused}
                  />
                </div>
              )}
            </div>
            <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === 'mem' && (
                <MemoryTable
                  machine={machine}
                  program={program}
                  view={view}
                  selected={selected}
                  breakpoints={breakpoints}
                  hideUnused={hideUnused}
                  followPc={followPc}
                  onSelect={onSelect}
                />
              )}
              {tab === 'hist' && <HistoryPanel machine={machine} view={view} onSelect={onSelect} />}
              {tab === 'isa' && <IsaPanel />}
            </div>
          </div>

          {selected !== null && (
            <AddressDetail
              key={selected}
              a={selected}
              machine={machine}
              program={program}
              view={view}
              onClose={() => setSelected(null)}
              onWrite={sim.write}
              onGotoLine={line => goto(line)}
            />
          )}
        </section>
      </main>
    </>
  );
}
