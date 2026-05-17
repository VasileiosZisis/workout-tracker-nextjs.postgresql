export type PaceActionState = {
  fieldErrors?: {
    performedDate?: string[];
    hours?: string[];
    minutes?: string[];
    seconds?: string[];
    distance?: string[];
  };
  formError?: string;
};
