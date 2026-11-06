import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { deletePaceSessionAction } from "../actions";

export function DeletePaceSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <DeleteConfirmationForm
      action={deletePaceSessionAction}
      label="I understand that this session will be deleted."
      description="This removes only this pace session."
    >
      <input name="sessionId" type="hidden" value={sessionId} />
    </DeleteConfirmationForm>
  );
}
