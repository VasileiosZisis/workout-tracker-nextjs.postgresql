export type IntervalActionState = {
  fieldErrors?: {
    performedDate?: string[];
    rounds?: string[];
    workMinutes?: string[];
    workSecondsPart?: string[];
    recoveryMinutes?: string[];
    recoverySecondsPart?: string[];
    includeFinalRecovery?: string[];
  };
  formError?: string;
};

