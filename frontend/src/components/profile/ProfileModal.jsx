import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Spinner, toast } from "@heroui/react";
import { Check, Clock, MessageCircle, Pencil, UserMinus, UserPlus, X } from "lucide-react";
import Modal from "../common/Modal";
import ProfileCard from "./ProfileCard";
import { api, errorMessage } from "../../lib/api";
import { useUIStore } from "../../store/useUIStore";
import { useFriendsStore } from "../../store/useFriendsStore";

// Buttons on the profile depend on how you relate to the person.
function RelationshipActions({ profile, onChange, onClose }) {
  const navigate = useNavigate();
  const openSettings = useUIStore((s) => s.openSettings);
  const { sendRequest, accept, decline, cancel, remove } = useFriendsStore.getState();
  const [busy, setBusy] = useState(false);
  const { status, requestId } = profile.relationship;

  const run = (fn, next) => async () => {
    setBusy(true);
    try {
      const result = await fn();
      onChange(typeof next === "function" ? next(result) : next);
    } catch (err) {
      toast.danger(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (status === "self")
    return (
      <Button
        size="sm"
        variant="secondary"
        onPress={() => {
          onClose();
          openSettings("profile");
        }}
      >
        <Pencil size={14} /> Edit profile
      </Button>
    );
  if (status === "friend")
    return (
      <>
        <Button
          size="sm"
          onPress={() => {
            onClose();
            navigate(`/chat/${profile._id}`);
          }}
        >
          <MessageCircle size={14} /> Message
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isIconOnly
          aria-label="Remove friend"
          isPending={busy}
          onPress={run(() => remove(profile._id), { status: "none" })}
        >
          <UserMinus size={15} />
        </Button>
      </>
    );
  if (status === "incoming")
    return (
      <>
        <Button size="sm" isPending={busy} onPress={run(() => accept(requestId), { status: "friend" })}>
          <Check size={14} /> Accept
        </Button>
        <Button size="sm" variant="secondary" isIconOnly aria-label="Ignore" onPress={run(() => decline(requestId), { status: "none" })}>
          <X size={15} />
        </Button>
      </>
    );
  if (status === "outgoing")
    return (
      <Button size="sm" variant="secondary" isPending={busy} onPress={run(() => cancel(requestId), { status: "none" })}>
        <Clock size={14} /> Cancel request
      </Button>
    );
  return (
    <Button
      size="sm"
      isPending={busy}
      onPress={run(
        () => sendRequest({ userId: profile._id }),
        (data) => (data.status === "accepted" ? { status: "friend" } : { status: "outgoing", requestId: data.request._id }),
      )}
    >
      <UserPlus size={14} /> Add friend
    </Button>
  );
}

function ProfileBody({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/users/${userId}`)
      .then(({ data }) => !cancelled && setProfile(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error) return <p className="p-10 text-center text-sm text-muted">Couldn't load this profile.</p>;
  if (!profile)
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="pb-5">
      <ProfileCard
        user={profile}
        actions={
          <RelationshipActions
            profile={profile}
            onClose={onClose}
            onChange={(relationship) => setProfile((p) => ({ ...p, relationship }))}
          />
        }
      />
    </div>
  );
}

export default function ProfileModal() {
  const userId = useUIStore((s) => s.profileUserId);
  const close = useUIStore((s) => s.closeProfile);

  return (
    <Modal open={!!userId} onClose={close} label="Profile" className="max-w-sm">
      {userId && <ProfileBody key={userId} userId={userId} onClose={close} />}
    </Modal>
  );
}
