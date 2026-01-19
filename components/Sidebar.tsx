
import React from 'react';
import { HomeIcon, ArrowUpTrayIcon, ChartBarIcon, ListBulletIcon, LogoIcon, DatabaseIcon, ClipboardDocumentListIcon } from './icons';

type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement' | 'reports' | 'stockManagement';

interface SidebarProps {
  activePane: Pane;
  setActivePane: (pane: Pane) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center p-2.5 text-base font-normal rounded-lg transition-all duration-200 group ${
        isActive
          ? 'bg-gradient-to-r from-[#00AEEF] to-[#0092C8] text-white shadow-lg'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ activePane, setActivePane }) => {
    return (
        <aside className="w-64 bg-slate-800 text-white flex-shrink-0 flex flex-col" aria-label="Sidebar">
            <div className="flex items-center h-24 border-b border-slate-700 px-6">
                <div className="bg-white p-1 rounded-xl shadow-inner">
                    <LogoIcon className="h-12 w-12 flex-shrink-0" />
                </div>
                <div className="ml-3">
                    <h1 className="text-xl font-black text-white leading-none tracking-tight">ETHEN</h1>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mt-1">POWER SOLUTIONNS</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <ul className="space-y-3">
                    <NavItem 
                        icon={<HomeIcon className="w-6 h-6" />}
                        label="Dashboard"
                        isActive={activePane === 'dashboard'}
                        onClick={() => setActivePane('dashboard')}
                    />
                     <NavItem 
                        icon={<ArrowUpTrayIcon className="w-6 h-6" />}
                        label="Create & Upload"
                        isActive={activePane === 'upload'}
                        onClick={() => setActivePane('upload')}
                    />
                     <NavItem 
                        icon={<ChartBarIcon className="w-6 h-6" />}
                        label="Performance Analysis"
                        isActive={activePane === 'analysis'}
                        onClick={() => setActivePane('analysis')}
                    />
                    <NavItem
                        icon={<ListBulletIcon className="w-6 h-6" />}
                        label="All Purchase Orders"
                        isActive={activePane === 'allOrders'}
                        onClick={() => setActivePane('allOrders')}
                    />
                     <NavItem 
                        icon={<DatabaseIcon className="w-6 h-6" />}
                        label="Stock Management"
                        isActive={activePane === 'stockManagement'}
                        onClick={() => setActivePane('stockManagement')}
                    />
                     <NavItem
                        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
                        label="Reports"
                        isActive={activePane === 'reports'}
                        onClick={() => setActivePane('reports')}
                    />
                    <NavItem
                        icon={<DatabaseIcon className="w-6 h-6" />}
                        label="Data Management"
                        isActive={activePane === 'dataManagement'}
                        onClick={() => setActivePane('dataManagement')}
                    />
                </ul>
            </div>
            <div className="p-4 border-t border-slate-700 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© {new Date().getFullYear()} ETHEN POWER SOLUTIONNS</p>
            </div>
        </aside>
    );
};

export default Sidebar;
