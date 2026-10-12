import { useCallback, useEffect, useRef, useState } from 'react';
import { assemble, sameImage, type Assembly } from '../neander/assembler';
import type { Text } from '../i18n/messages';
import { makeView, recIns } from '../neander/format';
import { Machine } from '../neander/machine';

export type StatusKind = '' | 'running' | 'paused' | 'halted' | 'error';
export interface Status {
  kind: StatusKind;
  text: Text;
}
export type Speed = '2' | '8' | '30' | '200' | 'max';

const HALTED_AGAIN: Status = { kind: 'halted', text: t => t.status.haltedAgain };
const insName = (m: Machine, program: Assembly) => {
  const rec = m.trace.at(-1);
  return rec ? recIns(rec, makeView({ addr: 'hex', val: 'hex' }, program)) : '';
};

/**
 * Owns the loaded program and the machine. The machine is mutated in place for speed;
 * `version` is bumped to re-render after each change.
 */
export function useSimulator(initialSource: string) {
  const machineRef = useRef<Machine | null>(null);
  if (!machineRef.current) machineRef.current = new Machine();
  const machine = machineRef.current;

  const [program, setProgram] = useState<Assembly>(() => {
    const first = assemble(initialSource);
    const p = first.errors.length ? assemble('') : first;
    machine.reset(p.mem);
    return p;
  });
  const [status, setStatus] = useState<Status>(() =>
    program.source === initialSource
      ? { kind: '', text: t => t.status.ready(program.bytes) }
      : { kind: 'error', text: t => t.status.badDraft }
  );
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const programRef = useRef(program);
  programRef.current = program;
  const speedRef = useRef<Speed>('8');
  const breakpointsRef = useRef<ReadonlySet<number>>(new Set());

  const load = useCallback(
    (source: string) => {
      const r = assemble(source);
      if (r.errors.length) {
        setStatus({ kind: 'error', text: t => t.status.notLoaded(r.errors.length) });
        return r;
      }
      setRunning(false);
      machine.reset(r.mem);
      setProgram(r);
      setStatus({ kind: '', text: t => t.status.loaded(r.bytes) });
      bump();
      return r;
    },
    [machine, bump]
  );

  /** Swaps in a re-formatted source that assembles to the same bytes, keeping the machine as it is. */
  const adopt = useCallback((source: string) => {
    const r = assemble(source);
    if (!r.errors.length && sameImage(r, programRef.current)) setProgram(r);
  }, []);

  const step = useCallback(() => {
    setRunning(false);
    if (machine.halted) {
      setStatus(HALTED_AGAIN);
    } else {
      machine.step();
      const steps = machine.steps, name = insName(machine, programRef.current);
      setStatus(
        machine.halted
          ? { kind: 'halted', text: t => t.status.haltedAfter(steps) }
          : { kind: 'paused', text: t => t.status.stepped(name) }
      );
    }
    bump();
  }, [machine, bump]);

  const back = useCallback(() => {
    setRunning(false);
    const name = insName(machine, programRef.current);
    const rec = machine.back();
    setStatus(rec ? { kind: 'paused', text: t => t.status.undone(name) } : { kind: '', text: t => t.status.nothingToUndo });
    bump();
  }, [machine, bump]);

  const reset = useCallback(() => {
    setRunning(false);
    machine.reset(programRef.current.mem);
    setStatus({ kind: '', text: t => t.status.reset });
    bump();
  }, [machine, bump]);

  const toggleRun = useCallback(() => {
    if (running) {
      setRunning(false);
      setStatus({ kind: 'paused', text: t => t.status.paused });
      return;
    }
    if (machine.halted) {
      setStatus(HALTED_AGAIN);
      return;
    }
    setStatus({ kind: 'running', text: t => t.status.running });
    setRunning(true);
  }, [running, machine]);

  const write = useCallback(
    (a: number, v: number) => {
      machine.write(a, v);
      bump();
    },
    [machine, bump]
  );

  const setSpeed = useCallback((s: Speed) => {
    speedRef.current = s;
  }, []);
  const setBreakpoints = useCallback((addrs: ReadonlySet<number>) => {
    breakpointsRef.current = addrs;
  }, []);

  // The run loop: a batch of steps per animation frame, sized by the chosen speed.
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now(), carry = 1, first = true;
    const frame = (ts: number) => {
      const sp = speedRef.current;
      let n: number;
      if (sp === 'max') n = 4000;
      else {
        carry += (Math.min(ts - last, 250) / 1000) * Number(sp);
        n = Math.floor(carry);
        carry -= n;
      }
      last = ts;
      for (let i = 0; i < n && !machine.halted; i++) {
        // the instruction we start from runs even if it has a breakpoint
        if (!first && breakpointsRef.current.has(machine.pc)) {
          setRunning(false);
          const line = programRef.current.lineOf[machine.pc];
          setStatus({ kind: 'paused', text: t => t.status.breakpoint(line) });
          bump();
          return;
        }
        first = false;
        machine.step();
      }
      if (machine.halted) {
        setRunning(false);
        const steps = machine.steps;
        setStatus({ kind: 'halted', text: t => t.status.haltedAfter(steps) });
        bump();
        return;
      }
      bump();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, machine, bump]);

  return {
    machine, program, status, running, version,
    load, adopt, step, back, reset, toggleRun, write, setSpeed, setBreakpoints, setStatus
  };
}

export type Simulator = ReturnType<typeof useSimulator>;
