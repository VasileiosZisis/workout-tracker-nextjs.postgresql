import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { deleteWeightliftingSessionAction } from "../actions";

export function DeleteWeightliftingSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteWeightliftingSessionAction}
      label="I understand that this session will be deleted."
      description="This removes only this weightlifting session and its sets."
    >
      <input name="sessionId" type="hidden" value={sessionId} />
    </DeleteConfirmationForm>
  );
}
