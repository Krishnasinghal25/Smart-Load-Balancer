import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MetricsProvider } from './context/MetricsContext';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ControlPage from './pages/ControlPage';
import ThreeView from './pages/ThreeView';
import HistoryPage from './pages/HistoryPage';
import ChatPage from './pages/ChatPage';
import InfoPage from './pages/InfoPage';

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, filter: 'blur(6px)', transition: { duration: 0.22 } },
};

function Page({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <MetricsProvider>
      <div className="scanlines min-h-screen flex flex-col relative">
        <div className="cyber-bg" />
        <div className="cyber-grid" />

        <Header />

        <main className="flex-1 relative z-10">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Page><Dashboard /></Page>} />
              <Route path="/control" element={<Page><ControlPage /></Page>} />
              <Route path="/3d" element={<Page><ThreeView /></Page>} />
              <Route path="/history" element={<Page><HistoryPage /></Page>} />
              <Route path="/chat" element={<Page><ChatPage /></Page>} />
              <Route path="/info" element={<Page><InfoPage /></Page>} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </MetricsProvider>
  );
}
