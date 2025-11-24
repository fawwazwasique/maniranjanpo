
import React from 'react';
import { HomeIcon, ArrowUpTrayIcon, ChartBarIcon, ListBulletIcon, LogoIcon, DatabaseIcon } from './icons';

type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement';

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
          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
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
            <div className="flex items-center h-20 border-b border-slate-700 px-4">
                <LogoIcon className="h-10 w-10 flex-shrink-0 text-red-500" />
                <div className="ml-3">
                    <h1 className="text-lg font-bold text-white leading-tight">Maniranjan</h1>
                    <p className="text-sm text-slate-300 leading-tight">PO Dashboard</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3">
                <ul className="space-y-2">
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
                        label="Data Management"
                        isActive={activePane === 'dataManagement'}
                        onClick={() => setActivePane('dataManagement')}
                    />
                </ul>
            </div>
        </aside>
    );
};

export default Sidebar;
