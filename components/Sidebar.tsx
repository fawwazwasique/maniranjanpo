
import React from 'react';
import { HomeIcon, ArrowUpTrayIcon, ChartBarIcon, ListBulletIcon, LogoIcon, DatabaseIcon, ClipboardDocumentListIcon, UserGroupIcon } from './icons';

type Pane = 'dashboard' | 'upload' | 'analysis' | 'allOrders' | 'dataManagement' | 'reports' | 'topCustomers' | 'detailedBreakdown';

type ThemeColor = 'classic' | 'emerald' | 'midnight' | 'sunset' | 'ocean';

interface SidebarProps {
  activePane: Pane;
  setActivePane: (pane: Pane) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
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
          ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ activePane, setActivePane, themeColor, setThemeColor }) => {
    const themes: { id: ThemeColor; color: string; label: string }[] = [
        { id: 'classic', color: 'bg-[#00AEEF]', label: 'Classic' },
        { id: 'emerald', color: 'bg-[#10B981]', label: 'Emerald' },
        { id: 'midnight', color: 'bg-[#6366F1]', label: 'Midnight' },
        { id: 'sunset', color: 'bg-[#F43F5E]', label: 'Sunset' },
        { id: 'ocean', color: 'bg-[#06B6D4]', label: 'Ocean' },
    ];

    return (
        <aside className="w-64 bg-slate-800 text-white flex-shrink-0 flex flex-col" aria-label="Sidebar">
            <div className="flex items-center h-24 border-b border-slate-700 px-6">
                <div className="bg-white p-1 rounded-xl shadow-inner">
                    <LogoIcon className="h-12 w-12 flex-shrink-0" />
                </div>
                <div className="ml-3">
                    <h1 className="text-xl font-black text-white leading-none tracking-tight">Ethen Group</h1>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mt-1">PO Dashboard</p>
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
                        icon={<UserGroupIcon className="w-6 h-6" />}
                        label="Top 50 Customer"
                        isActive={activePane === 'topCustomers'}
                        onClick={() => setActivePane('topCustomers')}
                    />
                    <NavItem
                        icon={<ListBulletIcon className="w-6 h-6" />}
                        label="Detailed Breakdown"
                        isActive={activePane === 'detailedBreakdown'}
                        onClick={() => setActivePane('detailedBreakdown')}
                    />
                    <NavItem
                        icon={<ListBulletIcon className="w-6 h-6" />}
                        label="All Purchase Orders"
                        isActive={activePane === 'allOrders'}
                        onClick={() => setActivePane('allOrders')}
                    />
                     <NavItem
                        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
                        label="OA No Report"
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

                <div className="mt-10 px-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Trending Themes</p>
                    <div className="grid grid-cols-5 gap-2">
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setThemeColor(t.id)}
                                title={t.label}
                                className={`w-8 h-8 rounded-full ${t.color} border-2 transition-all ${
                                    themeColor === t.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-slate-700 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© {new Date().getFullYear()} Fawwaz Creations</p>
            </div>
        </aside>
    );
};

export default Sidebar;
