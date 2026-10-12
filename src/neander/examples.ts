import type { Lang } from '../i18n/messages';

export type ExampleId = 'sum' | 'mul' | 'max' | 'array';

/** An example program, written once per language (names are in the messages). */
export interface Example {
  id: ExampleId;
  src: Record<Lang, string>;
}

export const EXAMPLES: Example[] = [
  {
    id: 'sum',
    src: {
      'pt-BR': `; Soma dois números: R = X + Y
; Aperte F10 para executar passo a passo e veja
; o AC, os flags e a tabela de memória mudarem.

        ORG 0
        LDA X       ; AC <- X
        ADD Y       ; AC <- AC + Y
        STA R       ; R  <- AC
        HLT

        ORG 128     ; os dados ficam em 80h
X:      DB 25
Y:      DB 17
R:      DB 0
`,
      en: `; Adds two numbers: R = X + Y
; Press F10 to run step by step and watch
; AC, the flags and the memory table change.

        ORG 0
        LDA X       ; AC <- X
        ADD Y       ; AC <- AC + Y
        STA R       ; R  <- AC
        HLT

        ORG 128     ; the data lives at 80h
X:      DB 25
Y:      DB 17
R:      DB 0
`
    }
  },
  {
    id: 'mul',
    src: {
      'pt-BR': `; Multiplica X por Y: R = X * Y
; O Neander não tem instrução de multiplicar (nem de
; subtrair), então o laço soma X em R, Y vezes. Y é
; decrementado somando -1 (FFh em complemento de dois).

        ORG 0
LACO:   LDA Y       ; enquanto Y != 0
        JZ  FIM
        ADD MENOS1  ; Y <- Y - 1
        STA Y
        LDA R       ; R <- R + X
        ADD X
        STA R
        JMP LACO
FIM:    HLT

        ORG 128
X:      DB 7
Y:      DB 6
R:      DB 0
MENOS1: DB -1
`,
      en: `; Multiplies X by Y: R = X * Y
; Neander has no multiply instruction (nor a subtract
; one), so the loop adds X to R, Y times. Y is
; decremented by adding -1 (FFh in two's complement).

        ORG 0
LOOP:   LDA Y       ; while Y != 0
        JZ  DONE
        ADD MINUS1  ; Y <- Y - 1
        STA Y
        LDA R       ; R <- R + X
        ADD X
        STA R
        JMP LOOP
DONE:   HLT

        ORG 128
X:      DB 7
Y:      DB 6
R:      DB 0
MINUS1: DB -1
`
    }
  },
  {
    id: 'max',
    src: {
      'pt-BR': `; Guarda o maior entre A e B em MAIOR (bytes com sinal).
; A subtração é feita com NOT e depois ADD 1, que dá -B.
; Funciona enquanto A - B couber em -128..127.

        ORG 0
        LDA B
        NOT
        ADD UM      ; AC <- -B
        ADD A       ; AC <- A - B
        JN  BMAIOR  ; negativo: B é maior
        LDA A
        JMP SALVA
BMAIOR: LDA B
SALVA:  STA MAIOR
        HLT

        ORG 128
A:      DB 23
B:      DB 42
MAIOR:  DB 0
UM:     DB 1
`,
      en: `; Stores the larger of A and B in MAX (signed bytes).
; The subtraction is done with NOT and then ADD 1, giving -B.
; Works as long as A - B fits in -128..127.

        ORG 0
        LDA B
        NOT
        ADD ONE     ; AC <- -B
        ADD A       ; AC <- A - B
        JN  BWINS   ; negative: B is larger
        LDA A
        JMP SAVE
BWINS:  LDA B
SAVE:   STA MAX
        HLT

        ORG 128
A:      DB 23
B:      DB 42
MAX:    DB 0
ONE:    DB 1
`
    }
  },
  {
    id: 'array',
    src: {
      'pt-BR': `; Soma os CONT bytes de TABELA em SOMA.
; O Neander não tem registrador de índice, então o
; programa reescreve o byte de endereço da sua própria
; instrução ADD (PEGA+1) para percorrer a tabela.
; Observe o endereço 0Bh mudar na tabela de memória.

        ORG 0
LACO:   LDA CONT
        JZ  FIM
        ADD MENOS1
        STA CONT
        LDA SOMA
PEGA:   ADD TABELA  ; este byte de operando é alterado
        STA SOMA
        LDA PEGA+1  ; avança o ponteiro um byte
        ADD UM
        STA PEGA+1
        JMP LACO
FIM:    HLT

        ORG 128
SOMA:   DB 0
CONT:   DB 5
UM:     DB 1
MENOS1: DB -1
TABELA: DB 3, 10, 7, 20, 2
`,
      en: `; Adds the COUNT bytes of TABLE into SUM.
; Neander has no index register, so the program
; rewrites the address byte of its own ADD
; instruction (FETCH+1) to walk through the table.
; Watch address 0Bh change in the memory table.

        ORG 0
LOOP:   LDA COUNT
        JZ  DONE
        ADD MINUS1
        STA COUNT
        LDA SUM
FETCH:  ADD TABLE   ; this operand byte gets changed
        STA SUM
        LDA FETCH+1 ; move the pointer one byte on
        ADD ONE
        STA FETCH+1
        JMP LOOP
DONE:   HLT

        ORG 128
SUM:    DB 0
COUNT:  DB 5
ONE:    DB 1
MINUS1: DB -1
TABLE:  DB 3, 10, 7, 20, 2
`
    }
  }
];
