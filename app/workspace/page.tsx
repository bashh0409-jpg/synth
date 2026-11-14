"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { reportClientError } from "@/lib/monitoring/client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ChevronLeft,
  Search,
  ChevronRight,
  PanelRightDashed,
  Plus,
  AtSign,
  Ellipsis,
  Expand,
  Minimize2,
  MessagesSquare,
  SquareTerminal,
  X,
  Command,
  ArrowBigUpDash,
  Globe,
  Delete,
  Earth,
  Settings,
  type LucideIcon,
  Podcast,
  Mic,
} from "lucide-react";
import ProfileAvatar from "./profile-avatar";
import AccountFlyout from "./account-flyout";
import ChatsSection, { type Chat } from "./chats-section";
import SettingsPanel from "./settings-panel";
import Watermark from "./watermark";
import { BsShift } from "react-icons/bs";

const iconBtn =
  "flex aspect-square w-7 cursor-pointer items-center justify-center rounded-md text-black/40 transition-colors duration-200 hover:bg-black/10 dark:text-white/50 dark:hover:bg-white/10";

const DEFAULT_SIZE = 60;
const MIN_SIZE = 30;
const MAX_SIZE = 70;
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 400;

function getWorkspaceErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    const details =
      "details" in error && typeof error.details === "string"
        ? error.details
        : "";
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";

    if (typeof message === "string" && message.trim()) {
      return [message, details, code && `(${code})`]
        .filter(Boolean)
        .join(" ");
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "An unknown error occurred while setting up the workspace.";
}

type SearchableTab =
  | {
      title: string;
      breadcrumb: string;
      destination: "settings";
      section: string;
    }
  | {
      title: string;
      breadcrumb: string;
      destination: "mode";
      mode: "agents" | "manual";
    }
  | {
      title: string;
      breadcrumb: string;
      destination: "subagents";
    };

type WorkspaceLocation = {
  isSettingsOpen: boolean;
  settingsSection: string;
  mode: "agents" | "manual";
  chatId: number | null;
  isSplitView: boolean;
};

const searchableTabs: SearchableTab[] = [
  {
    title: "Account",
    breadcrumb: "Settings > Account",
    destination: "settings",
    section: "Account",
  },
  {
    title: "Security & Privacy",
    breadcrumb: "Settings > Security & Privacy",
    destination: "settings",
    section: "Security & Privacy",
  },
  {
    title: "Passkeys",
    breadcrumb: "Settings > Security > Passkeys",
    destination: "settings",
    section: "Passkeys",
  },
  {
    title: "Plan & Usage",
    breadcrumb: "Settings > Plan & Usage",
    destination: "settings",
    section: "Plan & Usage",
  },
  {
    title: "Agents",
    breadcrumb: "Workspace > Agents",
    destination: "mode",
    mode: "agents",
  },
  {
    title: "Manual",
    breadcrumb: "Workspace > Manual",
    destination: "mode",
    mode: "manual",
  },
  {
    title: "Subagents",
    breadcrumb: "Workspace > Subagents",
    destination: "subagents",
  },
];

export default function Home() {
  const router = useRouter();
  const initialLocation: WorkspaceLocation = {
    isSettingsOpen: false,
    settingsSection: "Account",
    mode: "agents",
    chatId: null,
    isSplitView: false,
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [recentlyOpenedChatIds, setRecentlyOpenedChatIds] = useState<number[]>(
    [],
  );
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isSidePaneExpanded, setIsSidePaneExpanded] = useState(false);
  const [mainPaneSize, setMainPaneSize] = useState(DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState("Account");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"agents" | "manual">("agents");
  const [recentlyUsedTabs, setRecentlyUsedTabs] = useState<string[]>([]);
  const [workspaceLoadAttempt, setWorkspaceLoadAttempt] = useState(0);
  const [workspaceStatus, setWorkspaceStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [workspaceError, setWorkspaceError] = useState("");
  const [navigationIndex, setNavigationIndex] = useState(0);
  const navigationHistoryRef = useRef<WorkspaceLocation[]>([initialLocation]);
  const navigationIndexRef = useRef(0);
  const currentLocationRef = useRef(initialLocation);
  const splitAreaRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceShortcutHandlerRef = useRef<(event: KeyboardEvent) => void>(
    () => {},
  );
  const commandInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nextChatNumber = useRef(1);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const tabsOrderedByRecentUse = [
    ...recentlyUsedTabs
      .map((breadcrumb) =>
        searchableTabs.find((tab) => tab.breadcrumb === breadcrumb),
      )
      .filter((tab): tab is SearchableTab => tab !== undefined),
    ...searchableTabs.filter(
      (tab) => !recentlyUsedTabs.includes(tab.breadcrumb),
    ),
  ];
  const matchingChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(normalizedSearchQuery),
  );
  const recentlyOpenedChats = recentlyOpenedChatIds
    .map((chatId) => chats.find((chat) => chat.id === chatId))
    .filter((chat): chat is Chat => chat !== undefined);
  const visibleChats =
    normalizedSearchQuery.length === 0
      ? recentlyOpenedChats.slice(0, 3)
      : matchingChats;
  const matchingOpenTabs = tabsOrderedByRecentUse.filter(
    (tab) =>
      tab.title.toLowerCase().includes(normalizedSearchQuery) ||
      tab.breadcrumb.toLowerCase().includes(normalizedSearchQuery),
  );
  const visibleOpenTabs =
    normalizedSearchQuery.length === 0
      ? matchingOpenTabs.slice(0, 3)
      : matchingOpenTabs;
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeSettingsTab = searchableTabs.find(
    (tab) =>
      tab.destination === "settings" && tab.section === activeSettingsSection,
  );
  const currentHeaderTitle = isSettingsOpen
    ? (activeSettingsTab?.breadcrumb ??
      `Settings > ${activeSettingsSection}`)
    : activeChat?.title ??
      (isSplitView ? "Subagents" : mode === "agents" ? "Agents" : "Manual");
  const canNavigateBack = navigationIndex > 0;
  const canNavigateForward =
    navigationIndex < navigationHistoryRef.current.length - 1;

  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent) {
      workspaceShortcutHandlerRef.current(event);
    }

    document.addEventListener("keydown", handleWorkspaceShortcut);
    return () =>
      document.removeEventListener("keydown", handleWorkspaceShortcut);
  }, []);

  useEffect(() => {
    if (!isCommandOpen) return;

    commandInputRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleCommandKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCommand();
    }

    document.addEventListener("keydown", handleCommandKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleCommandKeyDown);
    };
  }, [isCommandOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    searchInputRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleSearchKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsSearchOpen(false);
    }

    document.addEventListener("keydown", handleSearchKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleSearchKeyDown);
    };
  }, [isSearchOpen]);

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  function closeCommand() {
    setIsCommandOpen(false);
    setCommandQuery("");
  }

  function markTabUsed(breadcrumb: string) {
    setRecentlyUsedTabs((current) => [
      breadcrumb,
      ...current.filter((recentTab) => recentTab !== breadcrumb),
    ]);
  }

  function markChatOpened(chatId: number) {
    setRecentlyOpenedChatIds((current) => [
      chatId,
      ...current.filter((recentChatId) => recentChatId !== chatId),
    ]);
  }

  function applyLocation(location: WorkspaceLocation) {
    currentLocationRef.current = location;
    setIsSettingsOpen(location.isSettingsOpen);
    setActiveSettingsSection(location.settingsSection);
    setMode(location.mode);
    setActiveChatId(location.chatId);
    setIsSplitView(location.isSplitView);
  }

  function navigateTo(location: WorkspaceLocation) {
    const currentIndex = navigationIndexRef.current;
    const history = navigationHistoryRef.current;
    const currentLocation = history[currentIndex];
    if (
      currentLocation &&
      currentLocation.isSettingsOpen === location.isSettingsOpen &&
      currentLocation.settingsSection === location.settingsSection &&
      currentLocation.mode === location.mode &&
      currentLocation.chatId === location.chatId &&
      currentLocation.isSplitView === location.isSplitView
    ) {
      return;
    }

    const nextHistory = [...history.slice(0, currentIndex + 1), location];
    const nextIndex = nextHistory.length - 1;
    navigationHistoryRef.current = nextHistory;
    navigationIndexRef.current = nextIndex;
    setNavigationIndex(nextIndex);
    applyLocation(location);
  }

  function navigateHistory(direction: -1 | 1) {
    const nextIndex = navigationIndexRef.current + direction;
    const location = navigationHistoryRef.current[nextIndex];
    if (!location) return;

    navigationIndexRef.current = nextIndex;
    setNavigationIndex(nextIndex);
    applyLocation(location);
  }

  function selectSettingsSection(section: string) {
    const tab = searchableTabs.find(
      (item) =>
        item.destination === "settings" && item.section === section,
    );
    if (!tab) throw new Error(`Unknown settings section: ${section}`);
    markTabUsed(tab.breadcrumb);
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: true,
      settingsSection: section,
    });
  }

  function selectMode(nextMode: "agents" | "manual") {
    const title = nextMode === "agents" ? "Agents" : "Manual";
    markTabUsed(`Workspace > ${title}`);
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: false,
      mode: nextMode,
    });
  }

  function openSubagentsTab() {
    setIsSidePaneExpanded(false);
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: false,
      isSplitView: true,
    });
    markTabUsed("Workspace > Subagents");
  }

  function openSettings() {
    const section = currentLocationRef.current.settingsSection;
    const tab = searchableTabs.find(
      (item) => item.destination === "settings" && item.section === section,
    );
    if (!tab) throw new Error(`Unknown settings section: ${section}`);
    markTabUsed(tab.breadcrumb);
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: true,
    });
  }

  function closeSettings() {
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: false,
    });
  }

  function selectChat(chatId: number) {
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: false,
      chatId,
    });
    markChatOpened(chatId);
  }

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          "Supabase is not configured. Check the public Supabase environment variables.",
        );
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .maybeSingle();

      if (error) throw error;

      let workspace = data;
      if (!workspace) {
        const { data: createdWorkspace, error: createError } = await supabase
          .from("workspaces")
          .insert({ owner_id: userData.user.id, name: "workspace" })
          .select("id")
          .single();

        if (createError?.code === "23505") {
          const {
            data: existingWorkspace,
            error: existingWorkspaceError,
          } = await supabase.from("workspaces").select("id").maybeSingle();

          if (existingWorkspaceError) throw existingWorkspaceError;
          if (!existingWorkspace) throw createError;
          workspace = existingWorkspace;
        } else if (createError) {
          throw createError;
        } else {
          workspace = createdWorkspace;
        }
      }

      if (!isActive) return;
      if (!workspace) throw new Error("Workspace setup returned no workspace.");
      setWorkspaceStatus("ready");
    }

    void loadWorkspace().catch((error: unknown) => {
      reportClientError("Unable to load the user's workspace.", error);
      if (!isActive) return;
      setWorkspaceError(getWorkspaceErrorMessage(error));
      setWorkspaceStatus("error");
    });

    return () => {
      isActive = false;
    };
  }, [router, workspaceLoadAttempt]);

  function createChat() {
    const number = nextChatNumber.current++;
    const chat = {
      id: number,
      title: number === 1 ? "New chat" : `New chat ${number}`,
    };
    setChats((currentChats) => [...currentChats, chat]);
    navigateTo({
      ...currentLocationRef.current,
      isSettingsOpen: false,
      chatId: chat.id,
    });
    markChatOpened(chat.id);
  }

  useGSAP(
    () => {
      const sidebar = sidebarRef.current;
      if (!sidebar) return;

      const duration = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? 0
        : 0.4;

      if (isSidebarOpen) {
        gsap.to(sidebar, {
          xPercent: 0,
          autoAlpha: 1,
          duration,
          ease: "power3.out",
          overwrite: "auto",
          onComplete: () => gsap.set(sidebar, { clearProps: "transform,opacity" }),
        });
        return;
      }

      gsap.to(sidebar, {
        xPercent: isSidebarHovered ? 0 : -100,
        autoAlpha: isSidebarHovered ? 1 : 0,
        duration,
        ease: isSidebarHovered ? "power3.out" : "power2.inOut",
        overwrite: "auto",
      });
    },
    { dependencies: [isSidebarOpen, isSidebarHovered], scope: sidebarRef },
  );

  function resizeSidebar(clientX: number) {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const maxWidth = getMaxSidebarWidth();
    const width = clientX - sidebar.getBoundingClientRect().left;
    setSidebarWidth(Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, width)));
  }

  function getMaxSidebarWidth() {
    return Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.45);
  }

  function resizePanes(clientX: number) {
    const splitArea = splitAreaRef.current;
    if (!splitArea) return;

    const bounds = splitArea.getBoundingClientRect();
    const percentage = ((clientX - bounds.left) / bounds.width) * 100;
    setMainPaneSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, percentage)));
  }

  function toggleSplitView() {
    if (!isSplitView) markTabUsed("Workspace > Subagents");
    navigateTo({
      ...currentLocationRef.current,
      isSplitView: !isSplitView,
    });
    setIsSidePaneExpanded(false);
    setMainPaneSize(DEFAULT_SIZE);
  }

  workspaceShortcutHandlerRef.current = (event) => {
    if (isCommandOpen || isSearchOpen || event.repeat) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches("input, textarea, select"))
    ) {
      return;
    }

    if (event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey) {
      if (event.code === "KeyA") {
        event.preventDefault();
        setIsSearchOpen(true);
      } else if (event.code === "KeyP") {
        event.preventDefault();
        setIsCommandOpen(true);
      }
      return;
    }

    if (event.metaKey && event.altKey && !event.shiftKey && !event.ctrlKey) {
      switch (event.code) {
        case "KeyN":
          event.preventDefault();
          createChat();
          break;
        case "Comma":
          event.preventDefault();
          openSettings();
          break;
        case "KeyB":
          event.preventDefault();
          setIsSidebarOpen((open) => !open);
          break;
        case "Digit1":
          event.preventDefault();
          selectMode("agents");
          break;
        case "Digit2":
          event.preventDefault();
          selectMode("manual");
          break;
        case "Digit3":
          event.preventDefault();
          openSubagentsTab();
          break;
        case "Backslash":
          event.preventDefault();
          toggleSplitView();
          break;
      }
    }
  };

  // Only animate open/close, never while dragging
  const paneTransition = isDragging
    ? "transition-none"
    : "transition-[flex-basis,opacity] duration-300 ease-in-out motion-reduce:transition-none";

  const commands: {
    label: string;
    description: string;
    icon: LucideIcon;
    shortcut?: {
      keys: string[];
      ariaLabel: string;
    };
    run: () => void;
  }[] = [
    {
      label: "New chat",
      description: "Start a new chat",
      icon: Plus,
      shortcut: {
        keys: ["⌥", "⌘", "N"],
        ariaLabel: "Option + Command + N",
      },
      run: () => {
        createChat();
        closeCommand();
      },
    },
    {
      label: "Search workspace",
      description: "Find chats and workspace tabs",
      icon: Search,
      shortcut: {
        keys: ["⇧", "⌘", "A"],
        ariaLabel: "Shift + Command + A",
      },
      run: () => {
        closeCommand();
        setIsSearchOpen(true);
      },
    },
    {
      label: "Open settings",
      description: "View workspace settings",
      icon: Settings,
      shortcut: {
        keys: ["⌥", "⌘", ","],
        ariaLabel: "Option + Command + Comma",
      },
      run: () => {
        openSettings();
        closeCommand();
      },
    },
    {
      label: isSidebarOpen ? "Collapse sidebar" : "Show sidebar",
      description: "Toggle the workspace sidebar",
      icon: PanelRightDashed,
      shortcut: {
        keys: ["⌥", "⌘", "B"],
        ariaLabel: "Option + Command + B",
      },
      run: () => {
        setIsSidebarOpen((open) => !open);
        closeCommand();
      },
    },
    {
      label: "Switch to Agents",
      description: "Use Agents mode",
      icon: Globe,
      shortcut: {
        keys: ["⌥", "⌘", "1"],
        ariaLabel: "Option + Command + 1",
      },
      run: () => {
        selectMode("agents");
        closeCommand();
      },
    },
    {
      label: "Switch to Manual",
      description: "Use Manual mode",
      icon: SquareTerminal,
      shortcut: {
        keys: ["⌥", "⌘", "2"],
        ariaLabel: "Option + Command + 2",
      },
      run: () => {
        selectMode("manual");
        closeCommand();
      },
    },
    {
      label: "Open Subagents",
      description: "Show the subagents pane",
      icon: MessagesSquare,
      shortcut: {
        keys: ["⌥", "⌘", "3"],
        ariaLabel: "Option + Command + 3",
      },
      run: () => {
        openSubagentsTab();
        closeCommand();
      },
    },
    {
      label: isSplitView ? "Close split view" : "Open split view",
      description: "Toggle the side pane",
      icon: PanelRightDashed,
      shortcut: {
        keys: ["⌥", "⌘", "\\"],
        ariaLabel: "Option + Command + Backslash",
      },
      run: () => {
        toggleSplitView();
        closeCommand();
      },
    },
  ];
  const normalizedCommandQuery = commandQuery.trim().toLowerCase();
  const matchingCommands = commands.filter(
    (command) =>
      command.label.toLowerCase().includes(normalizedCommandQuery) ||
      command.description.toLowerCase().includes(normalizedCommandQuery),
  );

  return (
    <div
      className={`relative flex overflow-hidden flex-1 items-left bg-zinc-200 font-sans dark:bg-black ${
        isResizingSidebar ? "cursor-col-resize select-none" : ""
      }`}
    >
      {!isSidebarOpen && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-30 w-2"
          onMouseEnter={() => setIsSidebarHovered(true)}
        />
      )}
      <aside
        ref={sidebarRef}
        aria-label="Workspace sidebar"
        aria-hidden={!isSidebarOpen && !isSidebarHovered}
        inert={!isSidebarOpen && !isSidebarHovered}
        onMouseLeave={() => {
          if (!isSidebarOpen) setIsSidebarHovered(false);
        }}
        style={{
          width: sidebarWidth,
          maxWidth: `min(45vw, ${MAX_SIDEBAR_WIDTH}px)`,
        }}
        className={`h-screen shrink-0 rounded-r-xl overflow-hidden ${
          isSidebarOpen
            ? "relative flex flex-col p-2"
            : `absolute inset-y-0 left-0 z-40 flex flex-col bg-zinc-100 p-2 dark:bg-zinc-950 ${
                isSidebarHovered
                  ? "border-r border-black/10 shadow-xl dark:border-white/10"
                  : "pointer-events-none"
              }`
        }`}
      >
        <div className="flex justify-between items-center w-full">
          <button
            aria-label="Toggle sidebar"
            className="hover:bg-black/10 cursor-pointer duration-200 flex items-center justify-center aspect-square w-7 rounded-md "
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z" />
            </svg>
          </button>
          <div className="flex items-center gap-1">
            <button
              aria-label="Create new chat"
              className="hover:bg-black/10 cursor-pointer duration-200 flex items-center justify-center aspect-square w-7 rounded-md text-black/40"
              onClick={createChat}
              type="button"
            >
              <Plus size={18} />
            </button>
            <button className="hover:bg-black/10 cursor-pointer duration-200 flex items-center justify-center aspect-square w-7 rounded-md text-black/40">
              <AtSign size={16} />
            </button>{" "}
            <button className="hover:bg-black/10 cursor-pointer duration-200 flex items-center justify-center aspect-square w-7 rounded-md text-black/40">
              <Mic size={16} />
            </button>{" "}
            <button
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Show sidebar"}
              className="hover:bg-black/10 cursor-pointer duration-200 flex items-center justify-center aspect-square w-7 rounded-md text-black/40"
              onClick={() => {
                setIsSidebarOpen((open) => !open);
              }}
              type="button"
            >
              <PanelRightDashed size={16} />
            </button>
          </div>
        </div>
        <ChatsSection
          activeChatId={activeChatId}
          chats={chats}
          onCreateChat={createChat}
          onSelectChat={selectChat}
        />

        <div className="flex w-full justify-between mt-auto">
          <AccountFlyout onOpenSettings={openSettings} />
          <div className="flex items-center h-8 gap-2">
            <button
              aria-label="Open command palette"
              aria-keyshortcuts="Meta+Shift+P"
              className="hover:bg-black/10 w-7 h-7 cursor-pointer p-1 duration-200 flex items-center justify-center rounded-lg text-black/40"
              onClick={() => setIsCommandOpen(true)}
              title="Open command palette (⇧⌘P)"
              type="button"
            >
              <Command size={16} />
            </button>
            <button
              aria-label="Search workspace"
              className="hover:bg-black/10 w-7 h-7 cursor-pointer p-1 duration-200 flex items-center justify-center rounded-lg text-black/40"
              onClick={() => setIsSearchOpen(true)}
              type="button"
            >
              <Search size={16} />
            </button>
          </div>
        </div>
        {isSidebarOpen && (
          <div
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuenow={Math.round(sidebarWidth)}
            className="group absolute inset-y-0 right-0 z-50 w-1 cursor-col-resize touch-none outline-none"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setSidebarWidth((width) =>
                  Math.max(MIN_SIDEBAR_WIDTH, width - 16),
                );
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setSidebarWidth((width) =>
                  Math.min(getMaxSidebarWidth(), width + 16),
                );
              }
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsResizingSidebar(true);
              resizeSidebar(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                resizeSidebar(event.clientX);
              }
            }}
            onPointerUp={() => setIsResizingSidebar(false)}
            onPointerCancel={() => setIsResizingSidebar(false)}
            onLostPointerCapture={() => setIsResizingSidebar(false)}
            role="separator"
            tabIndex={0}
          >
            <span className="absolute inset-y-0 -left-1 -right-1 bg-transparent" />
          </div>
        )}
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white dark:bg-black">
        {!isSplitView && !isSettingsOpen && <Watermark />}

        {/* Top bar */}
        <div className="relative z-10 flex h-11 w-full shrink-0 items-center justify-between px-2">
          <div className="flex items-center gap-1">
            {!isSidebarOpen && (
              <button
                aria-label="Show sidebar"
                className={iconBtn}
                onClick={() => setIsSidebarOpen(true)}
                type="button"
              >
                <PanelRightDashed size={16} />
              </button>
            )}
            <button
              aria-label="Go back"
              className={`${iconBtn} disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
              disabled={!canNavigateBack}
              onClick={() => navigateHistory(-1)}
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label="Go forward"
              className={`${iconBtn} disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
              disabled={!canNavigateForward}
              onClick={() => navigateHistory(1)}
              type="button"
            >
              <ChevronRight size={20} />
            </button>

            <span className="w-[2px] mx-1 h-5 bg-black/10" />
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
                className={`transition-colors duration-200 ${
                  mode === "agents"
                    ? "text-violet-600 dark:text-violet-300"
                    : "text-sky-600 dark:text-sky-300"
                }`}
              >
                <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z" />
              </svg>
              <span className="w-[2px] h-5 bg-black/10" />
              <p className="muted flex items-center gap-1 whitespace-nowrap font-medium text-sm tracking-tight">
                {isSettingsOpen
                  ? currentHeaderTitle.split(" > ").map((segment, index) => (
                      <span
                        className="inline-flex items-center gap-1"
                        key={`${segment}-${index}`}
                      >
                        {index > 0 && (
                          <ChevronRight
                            aria-hidden="true"
                            className="stroke-3"
                            size={14}
                          />
                        )}
                        {segment}
                      </span>
                    ))
                  : currentHeaderTitle}
              </p>{" "}
              {(!isSettingsOpen || activeChat) && (
                <button className={iconBtn}>
                  <Ellipsis size={18} />
                </button>
              )}
            </div>
          </div>

          <button
            aria-label="Profile"
            className="hover:bg-black/10 cursor-pointer w-6 aspect-square duration-200 flex items-center justify-center rounded-full"
            type="button"
          >
            <ProfileAvatar />
          </button>
        </div>

        {/* Split area: header rows live inside each pane */}
        <div
          ref={splitAreaRef}
          className={`relative z-10 flex min-h-0 flex-1 overflow-hidden border-t ${
            isSplitView
              ? "border-black/[0.06] dark:border-white/10"
              : "border-transparent"
          } ${isDragging ? "cursor-col-resize select-none" : ""}`}
        >
          {workspaceStatus === "loading" ? (
            <div
              aria-label="Loading workspace"
              className="flex flex-1 items-center justify-center"
              role="status"
            />
          ) : isSettingsOpen && workspaceStatus === "ready" ? (
            <SettingsPanel
              activeSection={activeSettingsSection}
              onActiveSectionChange={selectSettingsSection}
              onClose={closeSettings}
            />
          ) : (
            <>
              {/* Single toggle, pinned top-right, stays put in both modes */}
              <button
                aria-label={
                  isSplitView ? "Close split view" : "Open split view"
                }
                aria-pressed={isSplitView}
                className={`${iconBtn} absolute right-2 top-2.5 z-30 ${
                  isSplitView ? "bg-black/10 dark:bg-white/10" : ""
                }`}
                onClick={toggleSplitView}
                type="button"
              >
                <PanelRightDashed size={16} />
              </button>

              {/* Chat pane */}
              <section
                id="chat-pane"
                aria-hidden={isSidePaneExpanded}
                style={{
                  flexBasis: isSidePaneExpanded
                    ? "0%"
                    : isSplitView
                      ? `calc(${mainPaneSize}% - 0.5px)`
                      : "100%",
                }}
                className={`flex min-w-0 shrink-0 flex-col overflow-hidden ${paneTransition} ${
                  isSidePaneExpanded
                    ? "pointer-events-none opacity-0"
                    : "opacity-100"
                }`}
                inert={isSidePaneExpanded}
              >
                <div
                  className={`flex h-12 shrink-0 items-center justify-between pl-3 transition-[padding] duration-300 ${
                    isSplitView ? "pr-3" : "pr-11"
                  }`}
                >
                  <div
                    aria-label="Select mode"
                    className="flex items-center gap-1"
                    role="group"
                  >
                    <button
                      aria-pressed={mode === "agents"}
                      className={`flex h-8 cursor-pointer items-center gap-2 rounded-full border px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] transition-colors dark:shadow-none ${
                        mode === "agents"
                          ? "border-violet-500/25 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300"
                          : "border-black/[0.08] bg-white text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50"
                      }`}
                      onClick={() => selectMode("agents")}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="currentColor"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z" />
                      </svg>
                      Agents
                    </button>
                    <button
                      aria-pressed={mode === "manual"}
                      className={`flex h-8 cursor-pointer items-center gap-2 rounded-full border px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] transition-colors dark:shadow-none ${
                        mode === "manual"
                          ? "border-sky-500/25 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
                          : "border-black/[0.08] bg-white text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50"
                      }`}
                      onClick={() => selectMode("manual")}
                      type="button"
                    >
                      <SquareTerminal
                        aria-hidden="true"
                        className={
                          mode === "manual"
                            ? "text-sky-600 dark:text-sky-300"
                            : "text-black/40 dark:text-white/50"
                        }
                        size={18}
                      />
                      <div className="hidden">
                        <div className="text-zinc-900 dark:text-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <rect
                              width="24"
                              height="24"
                              rx="6"
                              fill="#6366F1"
                            />
                            <path
                              fill="#fff"
                              transform="translate(4.8 4.8) scale(0.6)"
                              d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z"
                            />
                          </svg>
                        </div>
                      </div>
                      Manual
                    </button>
                  </div>
                </div>
              </section>

              {/* Divider: 1px line, wider invisible hit area */}

              {isSplitView && !isSidePaneExpanded && (
                <div
                  aria-controls="chat-pane side-pane"
                  aria-label="Resize panels"
                  aria-orientation="vertical"
                  aria-valuemax={MAX_SIZE}
                  aria-valuemin={MIN_SIZE}
                  aria-valuenow={Math.round(mainPaneSize)}
                  className="relative z-20 w-px shrink-0 cursor-col-resize touch-none bg-black/[0.06] outline-none dark:bg-white/10"
                  onDoubleClick={() => setMainPaneSize(DEFAULT_SIZE)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      setMainPaneSize((size) => Math.max(MIN_SIZE, size - 2));
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      setMainPaneSize((size) => Math.min(MAX_SIZE, size + 2));
                    }
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setIsDragging(true);
                  }}
                  onPointerMove={(event) => {
                    if (
                      event.currentTarget.hasPointerCapture(event.pointerId)
                    ) {
                      resizePanes(event.clientX);
                    }
                  }}
                  onPointerUp={() => setIsDragging(false)}
                  onPointerCancel={() => setIsDragging(false)}
                  onLostPointerCapture={() => setIsDragging(false)}
                  role="separator"
                  tabIndex={0}
                >
                  {/* Invisible grab area, doesn't change how the line looks */}
                  <span className="absolute inset-y-0 -left-1.5 w-3" />
                </div>
              )}

              {/* Side pane */}
              <section
                id="side-pane"
                aria-hidden={!isSplitView}
                aria-label="Side chat preview"
                style={{
                  flexBasis: isSidePaneExpanded
                    ? "100%"
                    : isSplitView
                      ? `calc(${100 - mainPaneSize}% - 0.5px)`
                      : "0%",
                }}
                className={`flex min-w-0 shrink-0 flex-col overflow-hidden ${paneTransition} ${
                  isSplitView ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                inert={!isSplitView}
              >
                <div className="flex h-12 shrink-0 items-center gap-2 pl-3 pr-11">
                  <button
                    className="flex h-8 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                    onClick={openSubagentsTab}
                    type="button"
                  >
                    <div className="text-[#EC4899]">
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="currentColor"
                      >
                        <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4776 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002H11.7225ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803Z" />
                      </svg>
                    </div>
                    Subagents
                  </button>
                  <button className={iconBtn} aria-label="New tab">
                    <Plus size={16} />
                  </button>
                  <button
                    aria-label={
                      isSidePaneExpanded
                        ? "Restore split view"
                        : "Expand side pane"
                    }
                    className={`${iconBtn} ml-auto`}
                    onClick={() => setIsSidePaneExpanded((e) => !e)}
                    type="button"
                  >
                    {isSidePaneExpanded ? (
                      <Minimize2 size={15} />
                    ) : (
                      <Expand size={15} />
                    )}
                  </button>
                </div>
                <div className="min-h-0 flex-1 p-3" />
              </section>
            </>
          )}
          {workspaceStatus === "error" && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 backdrop-blur-sm dark:bg-black/45"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  event.preventDefault();
                }
              }}
            >
              <section
                aria-labelledby="workspace-error-heading"
                aria-modal="true"
                className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
                role="dialog"
              >
                <p
                  className="mb-4 text-center text-lg font-medium tracking-tight text-black dark:text-white/70"
                  id="workspace-error-heading"
                >
                  We couldn’t load or create your workspace. Check the setup and
                  try again.
                </p>
                {workspaceError && (
                  <p
                    className="mb-4 text-sm font-medium text-red-600"
                    role="alert"
                  >
                    {workspaceError}
                  </p>
                )}
                <button
                  className="mx-auto block cursor-pointer rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                  onClick={() => {
                    setWorkspaceStatus("loading");
                    setWorkspaceError("");
                    setWorkspaceLoadAttempt((attempt) => attempt + 1);
                  }}
                  type="button"
                >
                  Try again
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
      {isCommandOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 p-4 backdrop-blur-md dark:bg-black/50"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeCommand();
            }}
          >
            <section
              aria-label="Command palette"
              aria-modal="true"
              className="flex h-80 max-h-80 w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white p-2 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-zinc-900/95"
              role="dialog"
            >
              <div className="relative z-10 flex h-10 shrink-0 items-center gap-2 px-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-3 after:translate-y-full after:bg-gradient-to-b after:from-white after:to-transparent dark:after:from-zinc-900">
                <Command
                  aria-hidden="true"
                  className="shrink-0 text-black/45 dark:text-white/45"
                  size={16}
                />
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-medium tracking-tight outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
                  onChange={(event) => setCommandQuery(event.target.value)}
                  placeholder="Search commands"
                  ref={commandInputRef}
                  type="text"
                  value={commandQuery}
                />
                {commandQuery && (
                  <button
                    aria-label="Clear command search"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-black/45 transition-colors hover:bg-black/10 dark:text-white/45 dark:hover:bg-white/10"
                    onClick={() => {
                      setCommandQuery("");
                      commandInputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <Delete aria-hidden="true" size={18} />
                  </button>
                )}
              </div>

              <div className="flex mt-1 min-h-0 flex-wrap content-start gap-2 overflow-y-auto p-1">
                {matchingCommands.length > 0 ? (
                  matchingCommands.map((command) => (
                    <button
                      className="flex h-8 w-fit shrink-0 cursor-pointer items-center gap-2 rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:bg-white/10"
                      key={command.label}
                      onClick={command.run}
                      type="button"
                    >
                      <span className="truncate">{command.label}</span>

                      {command.shortcut && (
                        <kbd
                          aria-label={command.shortcut.ariaLabel}
                          className="flex shrink-0 items-center gap-1 rounded border border-black/10 bg-white px-1.5 py-0.5 text-xs font-semibold text-black dark:border-white/15 dark:bg-white/5 dark:text-white/50"
                        >
                          {command.shortcut.keys.map((key, index) => (
                            <span aria-hidden="true" key={`${key}-${index}`}>
                              {key === "⇧" ? <BsShift size={10} /> : key}
                            </span>
                          ))}
                        </kbd>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="w-full px-2 py-6 text-center text-sm text-black/45 dark:text-white/45">
                    No commands found.
                  </p>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )}
      {isSearchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 p-4 backdrop-blur-md dark:bg-black/50"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSearch();
            }}
          >
            <section
              aria-label="Search workspace"
              aria-modal="true"
              className="flex h-80 max-h-80 mi  w-full max-w-xl flex-col overflow-hidden rounded-xl  bg-white p-2 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-zinc-900/95"
              role="dialog"
            >
              <div className="relative z-10 flex font-medium h-10 shrink-0 items-center gap-2 px-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-3 after:translate-y-full after:bg-gradient-to-b after:from-white after:to-transparent dark:after:from-zinc-900">
                <Search
                  aria-hidden="true"
                  className="shrink-0 text-black/45 dark:text-white/45"
                  size={16}
                />
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent tracking-tight outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search workspace and chats"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    aria-label="Clear search"
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-black/45 transition-colors hover:bg-black/10 dark:text-white/45 dark:hover:bg-white/10"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <Delete aria-hidden="true" size={18} />
                  </button>
                )}
              </div>

              <div className="min-h-0 overflow-y-auto p-1">
                {(normalizedSearchQuery.length === 0 ||
                  visibleOpenTabs.length > 0) && (
                  <div className="mb-2">
                    <p className="flex text-[#666]  text-sm font-medium px-2 py-1  w-full rounded-md items-center gap-1 ">
                      Open Tabs
                    </p>
                    {visibleOpenTabs.map((tab) => (
                      <button
                        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm font-medium muted hover:bg-black/10 dark:hover:bg-white/10"
                        key={tab.breadcrumb}
                        onClick={() => {
                          if (tab.destination === "settings") {
                            selectSettingsSection(tab.section);
                          } else {
                            if (tab.destination === "mode") {
                              selectMode(tab.mode);
                            } else {
                              openSubagentsTab();
                            }
                          }
                          closeSearch();
                        }}
                        type="button"
                      >
                        <Globe
                          aria-hidden="true"
                          className="mr-1 shrink-0"
                          size={16}
                        />
                        {tab.breadcrumb}
                      </button>
                    ))}
                  </div>
                )}

                {(normalizedSearchQuery.length === 0
                  ? visibleChats.length > 0
                  : matchingChats.length > 0) && (
                  <div className="mt-4">
                    <p className="flex text-[#666]  text-sm font-medium px-2 py-1 w-full rounded-md items-center gap-1 ">
                      {normalizedSearchQuery.length === 0
                        ? "Recent chats"
                        : "Chats"}
                    </p>
                    {visibleChats.length > 0
                      ? visibleChats.map((chat) => (
                          <button
                            className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm hover:bg-black/[0.07] dark:hover:bg-white/10"
                            key={chat.id}
                            onClick={() => {
                              selectChat(chat.id);
                              closeSearch();
                            }}
                            type="button"
                          >
                            <Earth
                              aria-hidden="true"
                              className="shrink-0 text-black/45 dark:text-white/45"
                              size={15}
                            />

                            <p className="flex text-[#666] truncate min-w-0 text-sm font-medium w-full rounded-md items-center gap-1 ">
                              {chat.title}
                            </p>
                          </button>
                        ))
                      : null}
                  </div>
                )}

                {normalizedSearchQuery.length > 0 &&
                  matchingOpenTabs.length === 0 &&
                  matchingChats.length === 0 && (
                    <p className="px-2 py-6 font-medium text-center text-sm text-black/45 dark:text-white/45">
                      No results found.
                    </p>
                  )}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
