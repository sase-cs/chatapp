import { useState } from "react";
import { useClerk } from "@clerk/react";
import { Button, toast } from "@heroui/react";
import { ExternalLink } from "lucide-react";
import ProfileCard from "../profile/ProfileCard";
import { useAuthStore } from "../../store/useAuthStore";
import { errorMessage } from "../../lib/api";

const MAX_BIO = 190;

export default function ProfileSettings() {
  const me = useAuthStore((s) => s.me);
  const updateBio = useAuthStore((s) => s.updateBio);
  const { openUserProfile } = useClerk();
  const [bio, setBio] = useState(me.bio ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = bio !== (me.bio ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await updateBio(bio);
      toast.success("Profile saved");
    } catch (err) {
      toast.danger(errorMessage(err, "Couldn't save your profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">My Profile</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-[15px] font-semibold">Name and avatar</h2>
            <p className="mt-0.5 text-sm text-muted">These come from your account. Changes sync here automatically.</p>
            <Button className="mt-3" variant="secondary" size="sm" onPress={() => openUserProfile()}>
              Manage account <ExternalLink size={14} />
            </Button>
          </div>

          <div>
            <label htmlFor="bio" className="text-[15px] font-semibold">
              About me
            </label>
            <p className="mt-0.5 text-sm text-muted">A few words people see on your profile.</p>
            <div className="relative mt-3">
              <textarea
                id="bio"
                value={bio}
                maxLength={MAX_BIO}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Coffee, trail runs, and too many browser tabs."
                className="w-full resize-none rounded-xl border border-subtle bg-surface px-3.5 py-3 text-sm outline-none transition-colors focus:border-accent"
              />
              <span className="absolute right-3 bottom-3 text-[11px] text-muted tabular-nums">{MAX_BIO - bio.length}</span>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {dirty && (
                <Button variant="ghost" size="sm" onPress={() => setBio(me.bio ?? "")}>
                  Reset
                </Button>
              )}
              <Button size="sm" isDisabled={!dirty} isPending={saving} onPress={save}>
                Save changes
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">Preview</h2>
          <div className="overflow-hidden rounded-2xl border border-subtle bg-overlay pb-5 shadow-lg">
            <ProfileCard user={{ ...me, bio }} />
          </div>
        </div>
      </div>
    </div>
  );
}
