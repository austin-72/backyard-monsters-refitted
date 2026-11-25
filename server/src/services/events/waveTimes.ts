/**
 * The shortest a frozen wave can really take (SUSPECTED-BUGS.md: "a wave won is taken on the client's word").
 * Each wave's last group comes this many seconds after it starts (client: IoHfoWaves.WAVES, IoFmiTables.FMI1 and
 * FMI2), and the waves may run at twice the speed (QoL #114), so a wave can't be won in under
 * `WAVE_MIN_BASE + lastSurge / 2` seconds. A win reported sooner is counted as a loss and logged.
 * (Keep these in step with the client's tables: a new wave or a later group needs its time here.)
 */
export const WAVE_MIN_BASE = 4;

/** Hell Freezes Over: the last group's time, waves 1-13. */
export const HFO_LAST_SURGE = [0, 0, 0, 0, 0, 0, 20, 15, 20, 20, 20, 40, 55];

/** The Frozen Monster Invasions 1 and 2: the last group's time, waves 1-32. */
export const FMI_LAST_SURGE: Record<number, number[]> = {
  1: [0, 1, 1, 1, 0, 2, 5, 2, 6, 2, 0, 15, 15, 30, 0, 0, 30, 15, 30, 75, 0, 15, 0, 60, 15, 5, 0, 55, 105, 30, 65, 120],
  2: [0, 1, 1, 10, 6, 2, 5, 10, 16, 17, 15, 30, 65, 15, 25, 0, 30, 30, 150, 95, 30, 73, 45, 65, 20, 75, 60, 70, 210, 123, 149, 283],
};

/** Seconds a wave needs at least (wave counted from 1). */
export const waveMinSeconds = (table: number[] | undefined, wave: number): number =>
  WAVE_MIN_BASE + Math.floor((table?.[wave - 1] ?? 0) / 2);
