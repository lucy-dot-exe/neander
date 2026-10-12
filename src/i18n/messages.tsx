import type { DirectiveName, OpName } from '../neander/isa';

export type Lang = 'pt-BR' | 'en';
export const LANGS: { value: Lang; label: string; name: string }[] = [
  { value: 'pt-BR', label: 'PT', name: 'Português (Brasil)' },
  { value: 'en', label: 'EN', name: 'English' }
];

/** The browser's language when it is Portuguese, English otherwise. */
export const detectLang = (): Lang => (navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en');

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type OpText = { effect: string; desc: string };
/** Block text (%2 marks the operand), and the operand's default for a new block. */
type OpBlock = [text: string, def?: string];

const ptBR = {
  title: 'Bancada Neander',
  language: 'Idioma',
  top: {
    controls: 'Controles do programa',
    assemble: 'Montar',
    assembleTitle: 'Montar o código e carregá-lo na memória (Ctrl+Enter)',
    runControls: 'Controles de execução',
    back: 'Voltar',
    backTitle: 'Voltar: desfazer a última instrução (Shift+F10)',
    step: 'Passo',
    stepTitle: 'Passo: executar uma instrução (F10)',
    pause: 'Pausar',
    pauseTitle: 'Pausar (F5)',
    run: 'Executar',
    runTitle: 'Executar até um HLT ou ponto de parada (F5)',
    reset: 'Reiniciar',
    resetTitle: 'Reiniciar: zerar os registradores e restaurar a memória',
    speed: 'Velocidade',
    max: 'Máx.'
  },
  status: {
    ready: (bytes: number) => `${bytes} bytes carregados · aperte F10 para dar um passo`,
    badDraft: 'Seu rascunho salvo tem problemas · corrija e clique em Montar',
    notLoaded: (n: number) => `${count(n, 'problema', 'problemas')} · não carregado`,
    loaded: (bytes: number) => `${bytes} bytes carregados`,
    haltedAgain: 'Parado · clique em Reiniciar para rodar de novo',
    haltedAfter: (n: number) => `Parou após ${count(n, 'instrução', 'instruções')}`,
    stepped: (ins: string) => `Passo · ${ins}`,
    undone: (ins: string) => `Desfeito: ${ins}`,
    nothingToUndo: 'Nada para desfazer',
    reset: 'Reiniciado · memória restaurada',
    paused: 'Pausado',
    running: 'Executando',
    breakpoint: (line: number) => `Ponto de parada · linha ${line}`,
    exampleLoaded: (name: string) => `Exemplo carregado: ${name}`,
    fixBeforeBlocks: 'Corrija os problemas no código antes de mudar para blocos'
  },
  program: {
    section: 'Programa',
    editor: 'Editor',
    code: 'Código',
    blocks: 'Blocos',
    notAssembled: 'Não montado',
    info: (bytes: number, labels: number) => `${bytes} bytes · ${labels} rótulos`,
    examples: 'Exemplos',
    examplesLabel: 'Carregar um programa de exemplo',
    problems: (n: number) => count(n, 'problema', 'problemas'),
    line: (n: number) => `Linha ${n}`,
    andMore: (n: number) => `e mais ${n}`,
    loose: (n: number) =>
      `${n === 1 ? '1 bloco solto ignorado' : `${n} blocos soltos ignorados`} · encaixe embaixo de um bloco "no endereço"`
  },
  examples: {
    sum: 'Somar dois números',
    mul: 'Multiplicar por somas sucessivas',
    max: 'Maior de dois números',
    array: 'Somar um vetor (código automodificável)'
  },
  machine: {
    section: 'Máquina',
    panels: 'Painéis',
    tabs: { mem: 'Memória', hist: 'Histórico', isa: 'Instruções' },
    accumulator: 'Acumulador',
    negative: 'Negativo',
    zero: 'Zero',
    programCounter: 'Contador de programa',
    halted: 'Parado',
    next: 'Próxima'
  },
  detail: {
    roles: { op: 'Instrução', arg: 'Operando', data: 'Dado', res: 'Reservado' },
    address: 'Endereço',
    outside: 'Fora do programa',
    close: 'Fechar',
    closeLabel: 'Fechar detalhes',
    unsigned: 'Sem sinal',
    signed: 'Com sinal',
    binary: 'Binário',
    asInstruction: 'Lido como instrução',
    noInstruction: 'nenhuma (executa como NOP)',
    accesses: 'Acessos',
    counts: (fetched: number, read: number, written: number) => `buscado ${fetched} · lido ${read} · gravado ${written}`,
    lastWrite: ' · gravado pela última instrução',
    lastRead: ' · lido pela última instrução',
    source: 'Código-fonte',
    noSource: 'Sem linha de código; este byte não foi montado.',
    placeholder: 'Novo valor: 7, 07h, -1…',
    newValue: 'Novo valor',
    write: 'Gravar',
    badValue: (err: string) => `${err}. Tente 7, 07h, -1 ou 1010b.`,
    tooBig: (v: number) => `${v} não cabe em um byte (-128 a 255).`,
    written: (v: string, a: string) => `${v} gravado em ${a}. Voltar desfaz.`
  },
  history: {
    instructions: 'Instruções',
    accesses: 'Acessos à memória',
    empty: 'Nada foi executado ainda.',
    hintBefore: 'Clique em',
    hintAfter: 'para executar a primeira instrução.'
  },
  memory: {
    label: 'Conteúdo da memória. Use as setas para mudar de endereço.',
    marker: 'Marcador',
    address: 'Endereço',
    value: 'Valor',
    label_: 'Rótulo',
    meaning: 'Significado'
  },
  view: {
    menu: 'Exibição',
    address: 'Endereço',
    value: 'Valor',
    followPc: 'Seguir o PC',
    hideUnused: 'Ocultar endereços não usados',
    usedNext: 'Usado a seguir',
    readNow: 'Lido agora',
    writtenNow: 'Escrito agora'
  },
  isa: {
    code: 'Código',
    instruction: 'Instrução',
    effect: 'Efeito',
    operand: 'end',
    directives: (
      <>
        Diretivas: <code>ORG 128</code> define o endereço do próximo byte, <code>DB 5, -1, 0Ah</code> grava bytes,{' '}
        <code>DS 4</code> reserva bytes zerados, <code>DEZ EQU 10</code> dá nome a uma constante e <code>END</code> encerra a
        montagem. Rótulos terminam com dois-pontos. Números podem ser escritos como <code>12</code>, <code>0Ch</code>,{' '}
        <code>0x0C</code> ou <code>1100b</code>. Comentários começam com <code>;</code>.
      </>
    ),
    shortcuts: (
      <>
        Atalhos: <code>Ctrl+Enter</code> monta, <code>F10</code> dá um passo, <code>Shift+F10</code> volta, <code>F5</code>{' '}
        executa ou pausa e <code>F9</code> marca um ponto de parada na linha do cursor (no modo Código, clicar na margem
        também marca).
      </>
    )
  },
  ops: {
    NOP: { effect: 'Nenhuma operação', desc: 'Não faz nada.' },
    STA: { effect: 'MEM[end] ← AC', desc: 'Grava o acumulador na memória.' },
    LDA: { effect: 'AC ← MEM[end]', desc: 'Carrega o acumulador com um byte da memória. Atualiza N e Z.' },
    ADD: { effect: 'AC ← AC + MEM[end]', desc: 'Soma um byte da memória ao acumulador (8 bits, o vai-um se perde). Atualiza N e Z.' },
    OR: { effect: 'AC ← AC OR MEM[end]', desc: 'OU lógico bit a bit com um byte da memória. Atualiza N e Z.' },
    AND: { effect: 'AC ← AC AND MEM[end]', desc: 'E lógico bit a bit com um byte da memória. Atualiza N e Z.' },
    NOT: { effect: 'AC ← NOT AC', desc: 'Inverte todos os bits do acumulador (complemento de um). Atualiza N e Z.' },
    JMP: { effect: 'PC ← end', desc: 'Desvia para o endereço.' },
    JN: { effect: 'se N = 1: PC ← end', desc: 'Desvia se o último resultado foi negativo (bit 7 ligado).' },
    JZ: { effect: 'se Z = 1: PC ← end', desc: 'Desvia se o último resultado foi zero.' },
    HLT: { effect: 'Parar', desc: 'Para a máquina.' }
  } as Record<OpName, OpText>,
  directives: {
    ORG: 'Define o endereço onde os próximos bytes serão gravados. Exemplo: `ORG 128`',
    DB: 'Grava um ou mais bytes. Exemplo: `DB 5, -1, 0Ah`',
    DS: 'Reserva uma quantidade de bytes zerados. Exemplo: `DS 4`',
    EQU: 'Dá nome a uma constante. Exemplo: `DEZ EQU 10`',
    END: 'Encerra a montagem; as linhas seguintes são ignoradas.'
  } as Record<DirectiveName, string>,
  editor: {
    directive: 'diretiva',
    constant: 'constante',
    address: 'endereço',
    line: (n: number) => `linha ${n}`,
    inMemory: 'Na memória agora',
    breakpoint: 'Ponto de parada · clique para remover'
  },
  trace: {
    edited: (from: string, to: string) => `alterado à mão: ${from} → ${to}`,
    jumped: (flag: string, to: string) => `${flag}=1, desviou para ${to}`,
    noJump: (flag: string) => `${flag}=0, sem desvio`,
    halted: 'Máquina parada',
    nothing: 'Nada',
    notOpcode: (byte: string) => `${byte} não é um opcode do Neander; executado como NOP`
  },
  next: {
    halted: 'Parado',
    haltedWhat: 'O HLT foi executado. Clique em Reiniciar para recomeçar ou em Voltar para desfazer.',
    jumps: (flag: string, to: string) => `${flag} = 1, então desvia para ${to}`,
    continues: (flag: string, at: string) => `${flag} = 0, então continua em ${at}`,
    hlt: 'Para a máquina',
    nop: 'Não faz nada e segue em frente',
    notOpcode: (v: string) => `${v} não é opcode; é executado como NOP`
  },
  meaning: {
    notOpcode: (v: string) => `${v}: não é opcode`,
    operand: '↳ operando',
    data: 'dado',
    dataChanged: 'dado · alterado',
    reserved: 'reservado',
    written: 'gravado durante a execução'
  },
  asm: {
    missingValue: 'Falta um valor',
    unexpected: (tok: string) => `"${tok}" inesperado`,
    notNumber: (tok: string) => `"${tok}" não é um número nem um rótulo`,
    undefinedLabel: (name: string) => `Rótulo "${name}" não definido`,
    trailingOperator: 'O valor termina com um operador',
    expectedInstruction: (text: string) => `Era esperada uma instrução, mas foi encontrado "${text}"`,
    reservedLabel: (name: string) => `"${name}" é nome de instrução e não pode ser usado como rótulo`,
    duplicateLabel: (name: string, line: number) => `O rótulo "${name}" já foi definido na linha ${line}`,
    equNeedsName: 'EQU precisa de um nome, como em DEZ EQU 10',
    orgOutside: (v: number) => `ORG ${v} está fora da memória (0 a 255)`,
    dbEmpty: 'DB precisa de pelo menos um valor, como em DB 5',
    dsSize: 'DS precisa de um tamanho entre 1 e 256',
    unknownInstruction: (name: string) => `Instrução "${name}" desconhecida`,
    noOperand: (name: string) => `${name} não recebe operando`,
    needsAddress: (name: string) => `${name} precisa de um endereço, como em ${name} X`,
    pastEnd: 'O programa passa do último endereço, FFh (255)',
    addressUsed: (a: string, line: number) => `O endereço ${a} já é usado pela linha ${line}`,
    addressOutside: (v: number) => `O endereço ${v} está fora da memória (0 a 255)`,
    byteRange: (v: number) => `${v} não cabe em um byte (-128 a 255)`
  },
  blocks: {
    categories: { start: 'Início', memory: 'Memória', math: 'Aritmética e lógica', jumps: 'Desvios', data: 'Dados', notes: 'Notas' },
    start: 'no endereço %1',
    startTip: 'Tudo o que for encaixado embaixo vai para a memória a partir deste endereço (ORG).',
    label: 'rótulo %1',
    labelDefault: 'LACO',
    labelTip: 'Dá nome ao endereço do próximo bloco, para ser usado em desvios e cargas.',
    db: '%1 byte %2 = %3',
    dbTip: 'Grava bytes na memória (DB). Separe vários valores com vírgulas. O nome é opcional.',
    ds: '%1 reservar %2 bytes com o nome %3',
    dsTip: 'Reserva bytes zerados (DS).',
    equ: '%1 constante %2 = %3',
    equDefault: 'DEZ',
    equTip: 'Dá nome a um número sem usar memória (EQU).',
    note: 'nota %1',
    noteDefault: 'o que esta parte faz',
    noteTip: 'Um comentário. Não vai para a memória.',
    ops: {
      LDA: ['carregar AC com %2', 'X'],
      STA: ['guardar AC em %2', 'R'],
      ADD: ['somar %2 ao AC', 'Y'],
      NOT: ['inverter todos os bits do AC'],
      AND: ['E lógico do AC com %2', 'MASCARA'],
      OR: ['OU lógico do AC com %2', 'MASCARA'],
      JMP: ['desviar para %2', 'LACO'],
      JZ: ['se zero, desviar para %2', 'FIM'],
      JN: ['se negativo, desviar para %2', 'LACO'],
      NOP: ['não fazer nada'],
      HLT: ['parar a máquina']
    } as Record<OpName, OpBlock>
  }
};

export type Messages = typeof ptBR;
/** A message that is put into words only when shown, so it follows the current language. */
export type Text = (t: Messages) => string;

const en: Messages = {
  title: 'Neander Workbench',
  language: 'Language',
  top: {
    controls: 'Program controls',
    assemble: 'Assemble',
    assembleTitle: 'Assemble the code and load it into memory (Ctrl+Enter)',
    runControls: 'Run controls',
    back: 'Back',
    backTitle: 'Back: undo the last instruction (Shift+F10)',
    step: 'Step',
    stepTitle: 'Step: run one instruction (F10)',
    pause: 'Pause',
    pauseTitle: 'Pause (F5)',
    run: 'Run',
    runTitle: 'Run until a HLT or a breakpoint (F5)',
    reset: 'Reset',
    resetTitle: 'Reset: clear the registers and restore memory',
    speed: 'Speed',
    max: 'Max'
  },
  status: {
    ready: bytes => `${bytes} bytes loaded · press F10 to take a step`,
    badDraft: 'Your saved draft has problems · fix them and click Assemble',
    notLoaded: n => `${count(n, 'problem', 'problems')} · not loaded`,
    loaded: bytes => `${bytes} bytes loaded`,
    haltedAgain: 'Halted · click Reset to run again',
    haltedAfter: n => `Halted after ${count(n, 'instruction', 'instructions')}`,
    stepped: ins => `Step · ${ins}`,
    undone: ins => `Undone: ${ins}`,
    nothingToUndo: 'Nothing to undo',
    reset: 'Reset · memory restored',
    paused: 'Paused',
    running: 'Running',
    breakpoint: line => `Breakpoint · line ${line}`,
    exampleLoaded: name => `Example loaded: ${name}`,
    fixBeforeBlocks: 'Fix the problems in the code before switching to blocks'
  },
  program: {
    section: 'Program',
    editor: 'Editor',
    code: 'Code',
    blocks: 'Blocks',
    notAssembled: 'Not assembled',
    info: (bytes, labels) => `${bytes} bytes · ${count(labels, 'label', 'labels')}`,
    examples: 'Examples',
    examplesLabel: 'Load an example program',
    problems: n => count(n, 'problem', 'problems'),
    line: n => `Line ${n}`,
    andMore: n => `and ${n} more`,
    loose: n => `${count(n, 'loose block', 'loose blocks')} ignored · attach them under an "at address" block`
  },
  examples: {
    sum: 'Add two numbers',
    mul: 'Multiply by repeated addition',
    max: 'Larger of two numbers',
    array: 'Sum an array (self-modifying code)'
  },
  machine: {
    section: 'Machine',
    panels: 'Panels',
    tabs: { mem: 'Memory', hist: 'History', isa: 'Instructions' },
    accumulator: 'Accumulator',
    negative: 'Negative',
    zero: 'Zero',
    programCounter: 'Program counter',
    halted: 'Halted',
    next: 'Next'
  },
  detail: {
    roles: { op: 'Instruction', arg: 'Operand', data: 'Data', res: 'Reserved' },
    address: 'Address',
    outside: 'Outside the program',
    close: 'Close',
    closeLabel: 'Close details',
    unsigned: 'Unsigned',
    signed: 'Signed',
    binary: 'Binary',
    asInstruction: 'Read as an instruction',
    noInstruction: 'none (runs as NOP)',
    accesses: 'Accesses',
    counts: (fetched, read, written) => `fetched ${fetched} · read ${read} · written ${written}`,
    lastWrite: ' · written by the last instruction',
    lastRead: ' · read by the last instruction',
    source: 'Source',
    noSource: 'No source line; this byte was not assembled.',
    placeholder: 'New value: 7, 07h, -1…',
    newValue: 'New value',
    write: 'Write',
    badValue: err => `${err}. Try 7, 07h, -1 or 1010b.`,
    tooBig: v => `${v} doesn't fit in a byte (-128 to 255).`,
    written: (v, a) => `${v} written to ${a}. Back undoes it.`
  },
  history: {
    instructions: 'Instructions',
    accesses: 'Memory accesses',
    empty: 'Nothing has run yet.',
    hintBefore: 'Click',
    hintAfter: 'to run the first instruction.'
  },
  memory: {
    label: 'Memory contents. Use the arrow keys to change address.',
    marker: 'Marker',
    address: 'Address',
    value: 'Value',
    label_: 'Label',
    meaning: 'Meaning'
  },
  view: {
    menu: 'Display',
    address: 'Address',
    value: 'Value',
    followPc: 'Follow the PC',
    hideUnused: 'Hide unused addresses',
    usedNext: 'Used next',
    readNow: 'Just read',
    writtenNow: 'Just written'
  },
  isa: {
    code: 'Code',
    instruction: 'Instruction',
    effect: 'Effect',
    operand: 'addr',
    directives: (
      <>
        Directives: <code>ORG 128</code> sets the address of the next byte, <code>DB 5, -1, 0Ah</code> writes bytes,{' '}
        <code>DS 4</code> reserves zeroed bytes, <code>TEN EQU 10</code> names a constant and <code>END</code> ends
        assembly. Labels end with a colon. Numbers can be written as <code>12</code>, <code>0Ch</code>,{' '}
        <code>0x0C</code> or <code>1100b</code>. Comments start with <code>;</code>.
      </>
    ),
    shortcuts: (
      <>
        Shortcuts: <code>Ctrl+Enter</code> assembles, <code>F10</code> takes a step, <code>Shift+F10</code> goes back,{' '}
        <code>F5</code> runs or pauses and <code>F9</code> sets a breakpoint on the cursor's line (in Code mode, clicking
        the margin does too).
      </>
    )
  },
  ops: {
    NOP: { effect: 'No operation', desc: 'Does nothing.' },
    STA: { effect: 'MEM[addr] ← AC', desc: 'Stores the accumulator in memory.' },
    LDA: { effect: 'AC ← MEM[addr]', desc: 'Loads the accumulator with a byte from memory. Updates N and Z.' },
    ADD: { effect: 'AC ← AC + MEM[addr]', desc: 'Adds a byte from memory to the accumulator (8 bits, the carry is lost). Updates N and Z.' },
    OR: { effect: 'AC ← AC OR MEM[addr]', desc: 'Bitwise OR with a byte from memory. Updates N and Z.' },
    AND: { effect: 'AC ← AC AND MEM[addr]', desc: 'Bitwise AND with a byte from memory. Updates N and Z.' },
    NOT: { effect: 'AC ← NOT AC', desc: "Inverts every bit of the accumulator (one's complement). Updates N and Z." },
    JMP: { effect: 'PC ← addr', desc: 'Jumps to the address.' },
    JN: { effect: 'if N = 1: PC ← addr', desc: 'Jumps if the last result was negative (bit 7 set).' },
    JZ: { effect: 'if Z = 1: PC ← addr', desc: 'Jumps if the last result was zero.' },
    HLT: { effect: 'Halt', desc: 'Stops the machine.' }
  },
  directives: {
    ORG: 'Sets the address where the next bytes are written. Example: `ORG 128`',
    DB: 'Writes one or more bytes. Example: `DB 5, -1, 0Ah`',
    DS: 'Reserves a number of zeroed bytes. Example: `DS 4`',
    EQU: 'Names a constant. Example: `TEN EQU 10`',
    END: 'Ends assembly; the lines after it are ignored.'
  },
  editor: {
    directive: 'directive',
    constant: 'constant',
    address: 'address',
    line: n => `line ${n}`,
    inMemory: 'In memory now',
    breakpoint: 'Breakpoint · click to remove'
  },
  trace: {
    edited: (from, to) => `changed by hand: ${from} → ${to}`,
    jumped: (flag, to) => `${flag}=1, jumped to ${to}`,
    noJump: flag => `${flag}=0, no jump`,
    halted: 'Machine halted',
    nothing: 'Nothing',
    notOpcode: byte => `${byte} is not a Neander opcode; ran as NOP`
  },
  next: {
    halted: 'Halted',
    haltedWhat: 'HLT was executed. Click Reset to start over or Back to undo.',
    jumps: (flag, to) => `${flag} = 1, so it jumps to ${to}`,
    continues: (flag, at) => `${flag} = 0, so it continues at ${at}`,
    hlt: 'Stops the machine',
    nop: 'Does nothing and moves on',
    notOpcode: v => `${v} is not an opcode; it runs as NOP`
  },
  meaning: {
    notOpcode: v => `${v}: not an opcode`,
    operand: '↳ operand',
    data: 'data',
    dataChanged: 'data · changed',
    reserved: 'reserved',
    written: 'written while running'
  },
  asm: {
    missingValue: 'Missing a value',
    unexpected: tok => `Unexpected "${tok}"`,
    notNumber: tok => `"${tok}" is not a number or a label`,
    undefinedLabel: name => `Label "${name}" is not defined`,
    trailingOperator: 'The value ends with an operator',
    expectedInstruction: text => `Expected an instruction, but found "${text}"`,
    reservedLabel: name => `"${name}" is an instruction name and can't be used as a label`,
    duplicateLabel: (name, line) => `Label "${name}" was already defined on line ${line}`,
    equNeedsName: 'EQU needs a name, as in TEN EQU 10',
    orgOutside: v => `ORG ${v} is outside memory (0 to 255)`,
    dbEmpty: 'DB needs at least one value, as in DB 5',
    dsSize: 'DS needs a size between 1 and 256',
    unknownInstruction: name => `Unknown instruction "${name}"`,
    noOperand: name => `${name} takes no operand`,
    needsAddress: name => `${name} needs an address, as in ${name} X`,
    pastEnd: 'The program runs past the last address, FFh (255)',
    addressUsed: (a, line) => `Address ${a} is already used by line ${line}`,
    addressOutside: v => `Address ${v} is outside memory (0 to 255)`,
    byteRange: v => `${v} doesn't fit in a byte (-128 to 255)`
  },
  blocks: {
    categories: { start: 'Start', memory: 'Memory', math: 'Arithmetic and logic', jumps: 'Jumps', data: 'Data', notes: 'Notes' },
    start: 'at address %1',
    startTip: 'Everything attached below goes into memory starting at this address (ORG).',
    label: 'label %1',
    labelDefault: 'LOOP',
    labelTip: 'Names the address of the next block, for use in jumps and loads.',
    db: '%1 byte %2 = %3',
    dbTip: 'Writes bytes to memory (DB). Separate several values with commas. The name is optional.',
    ds: '%1 reserve %2 bytes named %3',
    dsTip: 'Reserves zeroed bytes (DS).',
    equ: '%1 constant %2 = %3',
    equDefault: 'TEN',
    equTip: 'Names a number without using memory (EQU).',
    note: 'note %1',
    noteDefault: 'what this part does',
    noteTip: 'A comment. It does not go into memory.',
    ops: {
      LDA: ['load AC with %2', 'X'],
      STA: ['store AC in %2', 'R'],
      ADD: ['add %2 to AC', 'Y'],
      NOT: ['invert every bit of AC'],
      AND: ['AND AC with %2', 'MASK'],
      OR: ['OR AC with %2', 'MASK'],
      JMP: ['jump to %2', 'LOOP'],
      JZ: ['if zero, jump to %2', 'DONE'],
      JN: ['if negative, jump to %2', 'LOOP'],
      NOP: ['do nothing'],
      HLT: ['stop the machine']
    }
  }
};

export const MESSAGES: Record<Lang, Messages> = { 'pt-BR': ptBR, en };
