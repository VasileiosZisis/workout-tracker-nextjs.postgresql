import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { deleteExerciseAction } from "../actions";

export function DeleteExerciseForm({ exerciseId }: { exerciseId: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteExerciseAction}
      label="I understand that this exercise will be deleted."
      description="This removes the exercise and every session recorded for it."
    >
      <input name="exerciseId" type="hidden" value={exerciseId} />
    </DeleteConfirmationForm>
  );
}
