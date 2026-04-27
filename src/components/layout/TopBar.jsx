import { BellIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from "../icons/Icons.jsx";

export default function TopBar({
  search,
  onSearchChange,
  onOpenMobileMenu,
  onToggleTheme,
  theme,
  offlineMeta,
}) {
  const offlineActive = Boolean(offlineMeta?.offlineModeActive);
  const pendingCount = Number(offlineMeta?.pendingCount || 0);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn mobile-only" type="button" onClick={onOpenMobileMenu} aria-label="Open menu">
          <MenuIcon className="nav-icon" />
        </button>
        <div className="topbar-brand" aria-label="T-ONE">
          T-ONE
        </div>
      </div>

      <div className="topbar-search">
        <div className="search" role="search">
          <SearchIcon className="nav-icon" />
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search products or orders..."
            aria-label="Search"
          />
        </div>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" type="button" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <SunIcon className="nav-icon" /> : <MoonIcon className="nav-icon" />}
        </button>

        <button
          className={`network-indicator ${offlineActive ? "is-offline" : "is-online"}`}
          type="button"
          aria-label={offlineActive ? "Offline mode active" : "Online"}
          title={offlineActive ? `${pendingCount} sale${pendingCount === 1 ? "" : "s"} waiting to sync` : "Online"}
          disabled
        >
          <span className="network-indicator-emoji" aria-hidden="true">
            {"\u{1F6DC}"}
          </span>
        </button>

        <button className="icon-btn topbar-notifications" type="button" aria-label="Notifications">
          <BellIcon className="nav-icon" />
        </button>
      </div>
    </header>
  );
}
