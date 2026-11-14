import { AnimatePresence } from "motion/react";
import { toast } from "@heroui/react";
import { Check, Inbox, X } from "lucide-react";
import FriendRow from "./FriendRow";
import IconButton from "../common/IconButton";
import EmptyState from "../common/EmptyState";
import { useFriendsStore } from "../../store/useFriendsStore";
import { errorMessage } from "../../lib/api";
import { formatRelative } from "../../lib/format";

function Section({ title, children, count }) {
  if (!count) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {title} — {count}
      </h2>
      <ul>
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </section>
  );
}

export default function PendingRequests() {
  const incoming = useFriendsStore((s) => s.incoming);
  const outgoing = useFriendsStore((s) => s.outgoing);
  const { accept, decline, cancel } = useFriendsStore.getState();

  const run = (fn, fallback) => async () => {
    try {
      await fn();
    } catch (err) {
      toast.danger(errorMessage(err, fallback));
    }
  };

  if (!incoming.length && !outgoing.length) {
    return <EmptyState icon={Inbox} title="No pending requests" text="Friend requests you send or receive show up here." />;
  }

  return (
    <>
      <Section title="Incoming" count={incoming.length}>
        {incoming.map((r, i) => (
          <FriendRow
            key={r._id}
            index={i}
            user={r.user}
            subtitle={`Incoming friend request · ${formatRelative(r.createdAt)}`}
            actions={
              <>
                <IconButton
                  label="Accept"
                  icon={Check}
                  variant="secondary"
                  className="hover:!text-success"
                  onPress={run(() => accept(r._id), "Couldn't accept request")}
                />
                <IconButton
                  label="Ignore"
                  icon={X}
                  variant="secondary"
                  className="hover:!text-danger"
                  onPress={run(() => decline(r._id), "Couldn't decline request")}
                />
              </>
            }
          />
        ))}
      </Section>
      <Section title="Sent" count={outgoing.length}>
        {outgoing.map((r, i) => (
          <FriendRow
            key={r._id}
            index={i}
            user={r.user}
            subtitle={`Outgoing friend request · ${formatRelative(r.createdAt)}`}
            actions={
              <IconButton
                label="Cancel request"
                icon={X}
                variant="secondary"
                className="hover:!text-danger"
                onPress={run(() => cancel(r._id), "Couldn't cancel request")}
              />
            }
          />
        ))}
      </Section>
    </>
  );
}
