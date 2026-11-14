import { Menu } from "lucide-react";
import IconButton from "../common/IconButton";
import { useUIStore } from "../../store/useUIStore";

// Top bar shared by every page. On phones it shows a button that opens the sidebar drawer.
export default function PageHeader({ children, actions }) {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-subtle bg-background/80 px-3 backdrop-blur-xl md:px-5">
      <div className="md:hidden">
        <IconButton label="Open menu" icon={Menu} onPress={() => setSidebarOpen(true)} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}
