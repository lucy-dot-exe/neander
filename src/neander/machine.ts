import { DATA_OPS, OPS, opOf, type OpName } from './isa';

export interface StepRec {
  kind: 'step';
  n: number;
  at: number;
  byte: number;
  name: OpName | null;
  addr: number | null;
  ac0: number;
  ac1: number;
  fn: number;
  fz: number;
  jumped: boolean;
}

export interface EditRec {
  kind: 'edit';
  at: number;
  old: number;
  val: number;
}

export type TraceRec = StepRec | EditRec;

type Undo =
  | {
      kind: 'step';
      ac: number; pc: number; n: number; z: number; halted: boolean; accesses: number;
      lastRead: number; lastWrite: number;
      fetched: number[]; read: number; written: number; old: number;
    }
  | { kind: 'edit'; a: number; old: number };

const MAX_HISTORY = 25000;

/** The Neander CPU and memory, with a per-address access count and full undo. */
export class Machine {
  mem = new Uint8Array(256);
  ac = 0;
  pc = 0;
  n = 0;
  z = 1;
  halted = false;
  steps = 0;
  accesses = 0;
  fetches = new Uint32Array(256);
  reads = new Uint32Array(256);
  writes = new Uint32Array(256);
  lastRead = -1;
  lastWrite = -1;
  /** One entry per instruction run or manual edit, oldest first; Back pops it. */
  trace: TraceRec[] = [];
  private undos: Undo[] = [];

  reset(image: Uint8Array) {
    this.mem = image.slice();
    this.ac = 0; this.pc = 0; this.n = 0; this.z = 1;
    this.halted = false; this.steps = 0; this.accesses = 0;
    this.fetches.fill(0); this.reads.fill(0); this.writes.fill(0);
    this.lastRead = -1; this.lastWrite = -1;
    this.trace = []; this.undos = [];
  }

  get canUndo() {
    return this.undos.length > 0;
  }

  /** Address the instruction at PC will read or write, or -1 when it touches no data. */
  nextDataTarget() {
    if (this.halted) return -1;
    const name = opOf(this.mem[this.pc]);
    return name && DATA_OPS.has(name) ? this.mem[(this.pc + 1) & 255] : -1;
  }

  step(): StepRec {
    const u: Extract<Undo, { kind: 'step' }> = {
      kind: 'step', ac: this.ac, pc: this.pc, n: this.n, z: this.z, halted: this.halted, accesses: this.accesses,
      lastRead: this.lastRead, lastWrite: this.lastWrite, fetched: [], read: -1, written: -1, old: 0
    };
    this.lastRead = -1;
    this.lastWrite = -1;
    const fetch = (a: number) => {
      this.fetches[a]++;
      this.accesses++;
      u.fetched.push(a);
      return this.mem[a];
    };
    const read = (a: number) => {
      this.reads[a]++;
      this.accesses++;
      this.lastRead = a;
      u.read = a;
      return this.mem[a];
    };
    const setAc = (v: number) => {
      this.ac = v & 255;
      this.n = this.ac >> 7;
      this.z = this.ac === 0 ? 1 : 0;
    };

    const at = this.pc;
    const byte = fetch(at);
    this.pc = (at + 1) & 255;
    const name = opOf(byte);
    let addr: number | null = null;
    if (name && OPS[name].size === 2) {
      addr = fetch(this.pc);
      this.pc = (this.pc + 1) & 255;
    }
    const ac0 = this.ac;
    let jumped = false;
    switch (name) {
      case 'STA':
        u.written = addr!;
        u.old = this.mem[addr!];
        this.mem[addr!] = this.ac;
        this.writes[addr!]++;
        this.accesses++;
        this.lastWrite = addr!;
        break;
      case 'LDA': setAc(read(addr!)); break;
      case 'ADD': setAc(this.ac + read(addr!)); break;
      case 'OR': setAc(this.ac | read(addr!)); break;
      case 'AND': setAc(this.ac & read(addr!)); break;
      case 'NOT': setAc(~this.ac); break;
      case 'JMP': this.pc = addr!; break;
      case 'JN': if (this.n) { this.pc = addr!; jumped = true; } break;
      case 'JZ': if (this.z) { this.pc = addr!; jumped = true; } break;
      case 'HLT': this.halted = true; break;
      default: break; // NOP and undefined opcodes do nothing
    }
    this.steps++;
    const rec: StepRec = { kind: 'step', n: this.steps, at, byte, name, addr, ac0, ac1: this.ac, fn: this.n, fz: this.z, jumped };
    this.push(u, rec);
    return rec;
  }

  /** Writes a byte by hand; Back undoes it like an instruction. */
  write(a: number, v: number): EditRec {
    const rec: EditRec = { kind: 'edit', at: a & 255, old: this.mem[a & 255], val: v & 255 };
    this.mem[rec.at] = rec.val;
    this.push({ kind: 'edit', a: rec.at, old: rec.old }, rec);
    return rec;
  }

  /** Undoes the last instruction or edit and returns its record. */
  back(): TraceRec | null {
    const u = this.undos.pop();
    if (!u) return null;
    const rec = this.trace.pop()!;
    if (u.kind === 'edit') {
      this.mem[u.a] = u.old;
      return rec;
    }
    this.ac = u.ac; this.pc = u.pc; this.n = u.n; this.z = u.z;
    this.halted = u.halted; this.accesses = u.accesses;
    this.lastRead = u.lastRead; this.lastWrite = u.lastWrite;
    for (const f of u.fetched) this.fetches[f]--;
    if (u.read >= 0) this.reads[u.read]--;
    if (u.written >= 0) {
      this.writes[u.written]--;
      this.mem[u.written] = u.old;
    }
    this.steps--;
    return rec;
  }

  private push(u: Undo, rec: TraceRec) {
    this.undos.push(u);
    this.trace.push(rec);
    if (this.undos.length > MAX_HISTORY) {
      this.undos.splice(0, 5000);
      this.trace.splice(0, 5000);
    }
  }
}
