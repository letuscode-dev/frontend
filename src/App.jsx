import { useEffect, useState } from "react";
import AppShell from "./components/layout/AppShell.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SalesPage from "./pages/SalesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ToastStack from "./components/ui/ToastStack.jsx";
import { useHashLocation } from "./lib/useHashLocation.js";
import { useAuth } from "./lib/useAuth.js";
import { getOfflineMeta, OFFLINE_POS_EVENT } from "./lib/offlinePos.js";
import { useTheme } from "./lib/useTheme.js";

function App() {
  const { routeKey, navigate } = useHashLocation();
  const { resolved: theme, toggle: toggleTheme } = useTheme();
  const auth = useAuth();
  const me = auth.user;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [offlineRevision, setOfflineRevision] = useState(0);

  useEffect(() => {
    const onOfflineChanged = () => setOfflineRevision((v) => v + 1);
    window.addEventListener(OFFLINE_POS_EVENT, onOfflineChanged);
    return () => window.removeEventListener(OFFLINE_POS_EVENT, onOfflineChanged);
  }, []);

  const offlineMeta = getOfflineMeta();

  const go = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const pageProps = {
    search: globalSearch,
    onSearchChange: setGlobalSearch,
    addProductOpen,
    onCloseAddProduct: () => setAddProductOpen(false),
    me,
    offlineRevision,
    offlineMeta,
  };

  if (auth.loading) {
    return (
      <>
        <ToastStack />
        <div className="auth">
          <div className="auth-bg" aria-hidden="true" />
          <div className="auth-card auth-card-simple auth-loading-card" style={{ textAlign: "center" }}>
            <div className="loading-emoji loading-emoji-lg" aria-label="Loading">
              🔄
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <ToastStack />
        <LoginPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogin={auth.login}
          onBootstrap={auth.bootstrap}
          onAuthenticated={() => navigate("/dashboard")}
        />
      </>
    );
  }

  let page = null;
  switch (routeKey) {
    case "dashboard":
      page = <DashboardPage {...pageProps} />;
      break;
    case "products":
      page = <ProductsPage {...pageProps} onOpenAddProduct={() => setAddProductOpen(true)} />;
      break;
    case "sales":
      page = <SalesPage {...pageProps} />;
      break;
    case "inventory":
      page = <InventoryPage {...pageProps} onOpenAddProduct={() => setAddProductOpen(true)} />;
      break;
    case "reports":
      page = <ReportsPage {...pageProps} />;
      break;
    case "settings":
      page = <SettingsPage {...pageProps} theme={theme} onToggleTheme={toggleTheme} onLogout={auth.logout} />;
      break;
    default:
      page = <DashboardPage {...pageProps} />;
  }

  return (
    <>
      <ToastStack />
      <AppShell
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        sidebar={
          <Sidebar
            activeKey={routeKey}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
            onNavigate={go}
            onAddProduct={() => setAddProductOpen(true)}
            me={me}
          />
        }
        topbar={
          <TopBar
            search={globalSearch}
            onSearchChange={setGlobalSearch}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onToggleTheme={toggleTheme}
            theme={theme}
            offlineMeta={offlineMeta}
          />
        }
      >
        {page}
      </AppShell>
    </>
  );
}

export default App;
