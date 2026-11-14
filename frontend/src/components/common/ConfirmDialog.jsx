import { useState } from "react";
import { Button } from "@heroui/react";
import Modal from "./Modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", danger = false }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} label={title} className="max-w-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex justify-end gap-2 bg-surface-secondary px-6 py-4">
        <Button variant="ghost" onPress={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onPress={confirm} isPending={busy} data-autofocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
