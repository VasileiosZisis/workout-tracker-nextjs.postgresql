export type WeightliftingActionState = {
  fieldErrors?: {
    performedDate?: string[];
    sets?: string[];
    workoutSelection?: string[];
  };
  formError?: string;
};

export type WeightliftingFormSet = {
  repetitions: string;
  kilograms: string;
  isHard: boolean;
};
