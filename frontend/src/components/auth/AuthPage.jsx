import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@heroui/react";
import { motion } from "motion/react";
import { MessagesSquare, Palette, UserPlus, Mic } from "lucide-react";
import Logo from "../common/Logo";

const FEATURES = [
  { icon: MessagesSquare, title: "Threads that stay readable", text: "Reply to any message and keep side conversations together." },
  { icon: UserPlus, title: "Friends first", text: "Add people by username. Only friends can message you." },
  { icon: Mic, title: "Photos, video and voice", text: "Share media or record a quick voice note." },
  { icon: Palette, title: "Make it yours", text: "Accent colors, dark mode and chat backgrounds." },
];

// A small animated preview of the chat UI for the right-hand side.
const PREVIEW = [
  { side: "in", text: "Are we still on for Saturday?", delay: 0.3 },
  { side: "out", text: "Yes! Trail at 9?", delay: 0.9 },
  { side: "in", text: "Perfect, I'll bring coffee", delay: 1.5 },
  { side: "out", text: "You're the best", delay: 2.1, reply: true },
];

function ChatPreview() {
  return (
    <div className="chat-bg chat-bg-aurora relative w-full max-w-sm overflow-hidden rounded-[28px] border border-subtle p-5 shadow-2xl shadow-black/10">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-rose-400" />
        <div>
          <div className="text-sm font-semibold">Maya</div>
          <div className="text-xs text-success">Online</div>
        </div>
      </div>
      <div className="relative flex flex-col gap-1.5">
        {/* thread line between the 2nd and 4th bubble, as in the real chat */}
        <motion.svg
          className="pointer-events-none absolute -right-3 top-[52px] h-[86px] w-3"
          viewBox="0 0 12 86"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          <motion.path
            d="M0 2 H6 Q10 2 10 6 V80 Q10 84 6 84 H0"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 2.4, duration: 0.6, ease: "easeOut" }}
          />
        </motion.svg>
        {PREVIEW.map((m) => (
          <motion.div
            key={m.text}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: m.delay, type: "spring", stiffness: 380, damping: 28 }}
            className={`flex ${m.side === "out" ? "justify-end" : "justify-start"}`}
            style={{ transformOrigin: m.side === "out" ? "bottom right" : "bottom left" }}
          >
            <div className={`bubble px-3.5 py-2 text-[15px] ${m.side === "out" ? "bubble-out" : "bubble-in"}`}>
              {m.text}
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8 }}
          className="mt-1 self-end text-[11px] font-medium text-accent"
        >
          1 reply
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto grid min-h-full max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Logo size={40} withName />
          <h1 className="mt-10 text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Conversations that stay <span className="text-accent">in the thread.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-muted">
            A real-time chat app for you and your friends, with threaded replies, voice notes and themes you can change.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <SignUpButton mode="modal">
              <Button size="lg">Create an account</Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </SignInButton>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                className="flex gap-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-sm text-muted">{text}</div>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="hidden justify-center lg:flex" style={{ animation: "auth-float-y 6s ease-in-out infinite" }}>
          <ChatPreview />
        </div>
      </div>
    </div>
  );
}
