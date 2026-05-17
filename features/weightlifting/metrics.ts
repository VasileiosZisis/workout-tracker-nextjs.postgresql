export type WeightliftingSetInput = {
  repetitions: number;
  kilograms: number;
  isHard: boolean;
};

export type WeightliftingSetWithVolume = WeightliftingSetInput & {
  position: number;
  volume: number;
};

export type WeightliftingMetrics = {
  sets: WeightliftingSetWithVolume[];
  totalVolume: number;
  junkVolume: number;
  workingVolume: number;
};

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateSetVolume({
  repetitions,
  kilograms,
}: Pick<WeightliftingSetInput, "repetitions" | "kilograms">) {
  return roundToTwo(repetitions * kilograms);
}

export function calculateWeightliftingMetrics(
  sets: WeightliftingSetInput[],
): WeightliftingMetrics {
  const setsWithVolume = sets.map((set, index) => ({
    ...set,
    position: index + 1,
    volume: calculateSetVolume(set),
  }));

  const totals = setsWithVolume.reduce(
    (accumulator, set) => {
      accumulator.totalVolume = roundToTwo(accumulator.totalVolume + set.volume);

      if (set.isHard) {
        accumulator.workingVolume = roundToTwo(
          accumulator.workingVolume + set.volume,
        );
      } else {
        accumulator.junkVolume = roundToTwo(accumulator.junkVolume + set.volume);
      }

      return accumulator;
    },
    {
      totalVolume: 0,
      junkVolume: 0,
      workingVolume: 0,
    },
  );

  return {
    sets: setsWithVolume,
    ...totals,
  };
}
