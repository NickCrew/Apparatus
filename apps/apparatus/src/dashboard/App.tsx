import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MainContent } from './components/layout/MainContent';
import { ThemeProvider } from './theme/ThemeProvider';
import { ApparatusProvider } from './providers/ApparatusProvider';
import { Overview } from './components/dashboard/Overview';

// Placeholder Components with basic styling
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full text-neutral-500 font-mono text-sm border-2 border-dashed border-neutral-800 rounded-lg bg-neutral-900/20">
    [{title.toUpperCase()}_MODULE_NOT_LOADED]
  </div>
);

const Traffic = () => <Placeholder title="Traffic" />;
const Defense = () => <Placeholder title="Defense" />;
const Deception = () => <Placeholder title="Deception" />;
const Chaos = () => <Placeholder title="Chaos" />;
const Cluster = () => <Placeholder title="Cluster" />;
const Webhooks = () => <Placeholder title="Webhooks" />;
const MTD = () => <Placeholder title="MTD" />;
const Testing = () => <Placeholder title="Testing" />;
const Network = () => <Placeholder title="Network" />;
const Settings = () => <Placeholder title="Settings" />;

function Layout() {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-primary-500/30 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <Header />
        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <ThemeProvider>
        <ApparatusProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="traffic" element={<Traffic />} />
              <Route path="defense" element={<Defense />} />
              <Route path="deception" element={<Deception />} />
              <Route path="chaos" element={<Chaos />} />
              <Route path="cluster" element={<Cluster />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="mtd" element={<MTD />} />
              <Route path="testing" element={<Testing />} />
              <Route path="network" element={<Network />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ApparatusProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}