export type WeightliftingActionState = {
  fieldErrors?: {
    performedDate?: string[];
    sets?: string[];
  };
  formError?: string;
};

export type WeightliftingFormSet = {
  repetitions: string;
  kilograms: string;
  isHard: boolean;
};
