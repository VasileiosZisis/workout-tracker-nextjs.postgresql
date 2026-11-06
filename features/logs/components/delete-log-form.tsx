import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { deleteLogAction } from "../actions";

export function DeleteLogForm({ logId }: { logId: string }) {
  return (
    <DeleteConfirmationForm
      action={deleteLogAction}
      label="I understand that this log will be deleted."
      description="This removes the log, its exercises, and all recorded sessions."
    >
      <input name="logId" type="hidden" value={logId} />
    </DeleteConfirmationForm>
  );
}
