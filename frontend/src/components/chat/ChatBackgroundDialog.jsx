import { toast } from "@heroui/react";
import Modal from "../common/Modal";
import BackgroundTiles, { BackgroundTile } from "./BackgroundTiles";
import { useAuthStore } from "../../store/useAuthStore";
import { CHAT_BACKGROUNDS } from "../../lib/backgrounds";

// Pick a background for one conversation only. "Default" follows the global setting.
export default function ChatBackgroundDialog({ open, onClose, partner }) {
  const preferences = useAuthStore((s) => s.preferences);
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  const override = preferences.chatBackgrounds?.[partner._id] ?? null;
  const globalLabel =
    preferences.background === "custom"
      ? "your image"
      : (CHAT_BACKGROUNDS.find((b) => b.id === preferences.background)?.label ?? "Aurora");

  const set = (background) =>
    updatePreferences({ chatBackground: { userId: partner._id, background } }).catch(() =>
      toast.danger("Couldn't save the background"),
    );

  return (
    <Modal open={open} onClose={onClose} label="Chat background" className="max-w-lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Background for this chat</h2>
        <p className="mt-1 text-sm text-muted">
          Only you see this. Other chats keep your default ({globalLabel}).
        </p>
        <div className="mt-5">
          <BackgroundTiles
            groupId="chat-bg"
            value={override ?? "__default"}
            onChange={set}
            customUrl={preferences.customBackgroundUrl}
            extra={
              <BackgroundTile
                groupId="chat-bg"
                selected={!override}
                label="Default"
                onSelect={() => set(null)}
                className={
                  preferences.background === "custom" ? "chat-bg-custom" : `chat-bg-${preferences.background}`
                }
                style={
                  preferences.background === "custom" && preferences.customBackgroundUrl
                    ? { backgroundImage: `url("${preferences.customBackgroundUrl}")` }
                    : undefined
                }
              />
            }
          />
        </div>
      </div>
    </Modal>
  );
}
