import User from "../models/user.model.js";

/**
 * Clerk sends users in snake_case from webhooks and camelCase from the SDK.
 * This turns both into the fields we store.
 */
function normalizeClerkUser(u) {
  const emails = u.email_addresses ?? u.emailAddresses ?? [];
  const primaryId = u.primary_email_address_id ?? u.primaryEmailAddressId;
  const pick = (e) => e?.email_address ?? e?.emailAddress;
  const email = pick(emails.find((e) => e.id === primaryId)) ?? pick(emails[0]);

  const firstName = u.first_name ?? u.firstName;
  const lastName = u.last_name ?? u.lastName;

  return {
    clerkId: u.id,
    email,
    clerkUsername: u.username || null,
    fullName:
      [firstName, lastName].filter(Boolean).join(" ") ||
      u.username ||
      email?.split("@")[0],
    profilePicture: u.image_url ?? u.imageUrl ?? "",
  };
}

function sanitizeUsername(raw = "") {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
  return cleaned.length >= 2 ? cleaned : `user${cleaned}`;
}

// Usernames are what people type in "Add friend", so they have to be unique.
async function findFreeUsername(base, excludeClerkId) {
  let candidate = sanitizeUsername(base);
  for (let attempt = 0; attempt < 10; attempt++) {
    const taken = await User.exists({
      username: candidate,
      clerkId: { $ne: excludeClerkId },
    });
    if (!taken) return candidate;
    candidate = `${sanitizeUsername(base).slice(0, 19)}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${sanitizeUsername(base).slice(0, 14)}${Date.now().toString(36)}`;
}

export async function upsertUserFromClerk(clerkUser) {
  const data = normalizeClerkUser(clerkUser);
  if (!data.email) throw new Error("Clerk user has no email address");

  const existing = await User.findOne({ clerkId: data.clerkId }).select(
    "username",
  );

  // A Clerk username always wins; otherwise keep the one we generated earlier.
  let username = existing?.username;
  if (data.clerkUsername || !username) {
    username = await findFreeUsername(
      data.clerkUsername || data.email.split("@")[0],
      data.clerkId,
    );
  }

  return User.findOneAndUpdate(
    { clerkId: data.clerkId },
    {
      $set: {
        email: data.email,
        fullName: data.fullName,
        profilePicture: data.profilePicture,
        username,
      },
      $setOnInsert: { clerkId: data.clerkId },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
}
