import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { deleteIntervalSessionAction } from "../actions";

export function DeleteIntervalSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteIntervalSessionAction}
      label="I understand that this session will be deleted."
      description="This removes only this interval session."
    >
      <input name="sessionId" type="hidden" value={sessionId} />
    </DeleteConfirmationForm>
  );
}
