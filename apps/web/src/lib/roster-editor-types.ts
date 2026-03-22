export type ParsedPlayer = {
  name: string;
  power: number | null;
  error: boolean;
};

export type ParsedRoster = {
  groupA: ParsedPlayer[];
  groupB: ParsedPlayer[];
  totalPlayers: number;
  totalPower: number;
};
