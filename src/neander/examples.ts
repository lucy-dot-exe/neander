export interface Example {
  id: string;
  name: string;
  src: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'sum',
    name: 'Somar dois números',
    src: `; Soma dois números: R = X + Y
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
`
  },
  {
    id: 'mul',
    name: 'Multiplicar por somas sucessivas',
    src: `; Multiplica X por Y: R = X * Y
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
`
  },
  {
    id: 'max',
    name: 'Maior de dois números',
    src: `; Guarda o maior entre A e B em MAIOR (bytes com sinal).
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
`
  },
  {
    id: 'array',
    name: 'Somar um vetor (código automodificável)',
    src: `; Soma os CONT bytes de TABELA em SOMA.
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
`
  }
];
