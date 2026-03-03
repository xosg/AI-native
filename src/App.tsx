import React, { useState } from 'react';
import { AdminView } from './components/AdminView';
import { EmployeeView } from './components/EmployeeView';
import { useStore } from './store';
import { LayoutDashboard, GraduationCap, UserCircle } from 'lucide-react';

export default function App() {
  const [state, setState] = useState(useStore.getData());
  const [view, setView] = useState<'admin' | 'employee'>('admin');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(state.employees[0].id);

  const handleRoleSwitch = (role: 'admin' | 'employee') => {
    setView(role);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Digitized Incorporated University</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hackathon Demo System</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => handleRoleSwitch('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'admin' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
          >
            <LayoutDashboard size={16} />
            Admin View
          </button>
          <button 
            onClick={() => handleRoleSwitch('employee')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'employee' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
          >
            <UserCircle size={16} />
            Employee View
          </button>
        </div>

        {view === 'employee' && (
          <div className="flex items-center gap-3">
            <select 
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-gray-50 border border-black/5 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black"
            >
              {state.employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'admin' ? (
          <AdminView />
        ) : (
          <EmployeeView employeeId={selectedEmployeeId} />
        )}
      </main>
    </div>
  );
}
