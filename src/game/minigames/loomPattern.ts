export const LOOM_CELLS = 9;
export const LOOM_PATTERN_LENGTHS = [3, 4, 5] as const;

export type LoomStatus = "input" | "won";

export type LoomState = {
  round: number;
  target: number[];
  input: number[];
  patterns: number[][];
  status: LoomStatus;
};

export function generateLoomPatterns(rng: () => number = Math.random): number[][] {
  return LOOM_PATTERN_LENGTHS.map((length) => {
    const cells: number[] = [];
    while (cells.length < length) {
      let cell = Math.floor(rng() * LOOM_CELLS) % LOOM_CELLS;
      if (cell === cells[cells.length - 1]) {
        cell = (cell + 1) % LOOM_CELLS;
      }
      cells.push(cell);
    }
    return cells;
  });
}

export function createLoomState(patterns: number[][]): LoomState {
  return {
    round: 0,
    patterns,
    target: patterns[0] ?? [],
    input: [],
    status: "input",
  };
}

export function tapLoomCell(state: LoomState, cell: number): LoomState {
  if (state.status !== "input") {
    return state;
  }
  if (cell < 0 || cell >= LOOM_CELLS) {
    return state;
  }
  const nextInput = [...state.input, cell];
  const expected = state.target[nextInput.length - 1];
  if (expected !== cell) {
    return { ...state, input: [] };
  }
  if (nextInput.length < state.target.length) {
    return { ...state, input: nextInput };
  }
  const nextRound = state.round + 1;
  if (nextRound >= state.patterns.length) {
    return { ...state, input: nextInput, round: nextRound, status: "won" };
  }
  return {
    ...state,
    round: nextRound,
    target: state.patterns[nextRound],
    input: [],
  };
}
