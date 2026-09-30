import { useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import RoleSwitcher from './RoleSwitcher';
import { DocumentViewer } from './Shared';

export const ViewerContext = createContext(null);
export function useViewer() { return useContext(ViewerContext); }

export default function Layout() {
  const [viewerState, setViewerState] = useState(null); // { doc, highlightRegion, targetPage, highlightValue } | null

  function openViewer(doc, highlightRegion, targetPage, highlightValue) {
    setViewerState({ doc, highlightRegion, targetPage: targetPage || 1, highlightValue });
  }

  return (
    <ViewerContext.Provider value={{ open: openViewer }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 56, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, background: '#fff' }}>
            <Breadcrumbs />
            <RoleSwitcher />
          </div>
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet />
          </div>
        </div>
        <DocumentViewer
          doc={viewerState ? viewerState.doc : null}
          highlightRegion={viewerState ? viewerState.highlightRegion : null}
          targetPage={viewerState ? viewerState.targetPage : 1}
          highlightValue={viewerState ? viewerState.highlightValue : null}
          onClose={() => setViewerState(null)}
        />
      </div>
    </ViewerContext.Provider>
  );
}
