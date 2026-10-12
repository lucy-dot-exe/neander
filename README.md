# Bancada Neander

A web workbench for **Neander**, the 8-bit teaching computer designed by Raul Weber and used in the
computer architecture courses at UFRGS. Write a program, assemble it, run it one instruction at a time
and watch every register, flag and memory address change. The interface is in Brazilian Portuguese or English,
switchable from the top bar (it starts in the browser's language).

## Features

- **Two ways to write programs:** a code editor (Monaco, the editor from VS Code) with syntax
  highlighting, autocomplete, hover help and inline errors, or Scratch-style blocks (Blockly).
  Both edit the same program, so you can switch at any time.
- **Assembler:** labels (`LOOP:`), the directives `ORG`, `DB`, `DS`, `EQU` and `END`, numbers as
  `12`, `0Ch`, `0x0C` or `1100b`, and expressions such as `GET+1`. Errors are reported per line.
- **Execution:** step forward (F10), step back (Shift+F10) all the way to the start, run until HLT or a
  breakpoint (F5) at five speeds, and reset memory to the loaded program.
- **Inspection:** AC and PC as lamps, the N and Z flags, the next instruction with its effect worked
  out, a history of every instruction, and a 256-row memory table that marks the byte at PC, the next
  data access and the bytes just read or written. Click an address for its value in every base, how
  often it was fetched/read/written, the source line that produced it, and a box to change it.
- **Display formats:** addresses and values in hex, decimal or binary, chosen separately.
- **Examples** (in both languages): addition, multiplication by repeated addition, the larger of two numbers, and an array
  sum that rewrites its own code (Neander has no index register).

Your program, language, editor mode and display choices are saved in the browser.

## Development

Requires Node 20 or later.

```sh
npm install
npm run dev        # start the dev server
npm test           # unit tests for the assembler, the machine and the block conversion
npm run build      # type-check and build to dist/
npm run preview    # serve the built site
```

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the tests and the build on every pull request
and every push to `main`. Pushes to `main` are then published to GitHub Pages at <https://lucy-dot-exe.github.io/neander/>.
The site lives under `/neander/`, so the workflow builds with `--base=/neander/`; to try that build locally, run
`npm run build -- --base=/neander/` and `npm run preview -- --base=/neander/`.

## Layout

| Path | What it holds |
|---|---|
| `src/neander/` | The instruction set, assembler, machine (with undo) and display formatting. No UI code. |
| `src/i18n/` | Every piece of interface text, in Portuguese and English, and the React context that selects one. |
| `src/blocks/` | Block definitions for Blockly and the conversion between blocks and assembly text. |
| `src/hooks/useSimulator.ts` | Loaded program, machine state, status messages and the run loop. |
| `src/components/` | The editors and the machine panels. |
| `src/App.tsx` | Wires everything together, plus keyboard shortcuts and saved preferences. |

## Neander in brief

8-bit words and addresses, 256 bytes of memory, one accumulator (AC), a program counter (PC) and two
flags, N (negative) and Z (zero). The opcode is the high nibble of the first byte; instructions that
take an address use a second byte.

| Code | Instruction | Effect |
|---|---|---|
| 00 | NOP | nothing |
| 10 | STA addr | MEM[addr] ← AC |
| 20 | LDA addr | AC ← MEM[addr] |
| 30 | ADD addr | AC ← AC + MEM[addr] |
| 40 | OR addr | AC ← AC OR MEM[addr] |
| 50 | AND addr | AC ← AC AND MEM[addr] |
| 60 | NOT | AC ← NOT AC |
| 80 | JMP addr | PC ← addr |
| 90 | JN addr | if N = 1: PC ← addr |
| A0 | JZ addr | if Z = 1: PC ← addr |
| F0 | HLT | stop |

LDA, ADD, OR, AND and NOT update N and Z. Undefined opcodes run as NOP.
