import { useEffect } from "react";
import { Show, useAuth } from "@clerk/react";
import { Navigate, Route, Routes } from "react-router";
import { Button } from "@heroui/react";
import { setTokenGetter } from "./lib/api";
import { watchSystemTheme } from "./lib/theme";
import { useAuthStore } from "./store/useAuthStore";
import { useFriendsStore } from "./store/useFriendsStore";
import { useChatStore } from "./store/useChatStore";
import { useSocketStore } from "./store/useSocketStore";
import AuthPage from "./components/auth/AuthPage";
import AppShell from "./components/layout/AppShell";
import FriendsPage from "./components/friends/FriendsPage";
import ChatView from "./components/chat/ChatView";
import SplashScreen from "./components/common/SplashScreen";

function SignedInApp() {
  const { getToken } = useAuth();
  const status = useAuthStore((s) => s.status);
  const loadMe = useAuthStore((s) => s.loadMe);

  useEffect(() => {
    setTokenGetter(() => getToken());

    let cancelled = false;
    (async () => {
      await loadMe();
      if (cancelled || useAuthStore.getState().status !== "ready") return;
      // the socket handshake needs the user to exist in MongoDB, which loadMe guarantees
      useSocketStore.getState().connect(() => getToken());
      useFriendsStore.getState().load().catch(console.error);
      useChatStore.getState().loadConversations().catch(console.error);
    })();

    const stopWatching = watchSystemTheme(() => useAuthStore.getState().preferences);
    return () => {
      cancelled = true;
      stopWatching();
      useSocketStore.getState().disconnect();
    };
  }, [getToken, loadMe]);

  if (status === "error") {
    return (
      <SplashScreen>
        <p className="text-sm text-muted">We couldn't reach the server.</p>
        <Button variant="secondary" onPress={loadMe}>
          Try again
        </Button>
      </SplashScreen>
    );
  }
  if (status !== "ready") return <SplashScreen />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<FriendsPage />} />
        <Route path="chat/:userId" element={<ChatView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <>
      <Show when="signed-out">
        <AuthPage />
      </Show>
      <Show when="signed-in">
        <SignedInApp />
      </Show>
    </>
  );
}

export default App;
