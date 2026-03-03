import React, { useState } from 'react';
import { Project, Employee, geminiService } from '../services/gemini';
import { useStore } from '../store';
import { MapComponent } from './Map';
import { Plus, MapPin, Info, Users, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminView: React.FC = () => {
  const [state, setState] = useState(useStore.getData());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.3942, 13.1255]); // XU Potsdam
  const [mapZoom, setMapZoom] = useState(16);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  const handleAddProject = async () => {
    if (!newProject.name || !newProject.description) return;
    setIsLoading(true);
    try {
      const idleEmployees = state.employees.filter(e => !e.currentProjectId);
      const result = await geminiService.extractSkillsAndGenerateSubtasks(
        newProject.name,
        newProject.description,
        idleEmployees
      );

      const project: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProject.name,
        description: newProject.description,
        progress: 0,
        status: 'active',
        // Random nearby coordinates
        coordinates: [
          52.3942 + (Math.random() - 0.5) * 0.005,
          13.1255 + (Math.random() - 0.5) * 0.005
        ],
        skills: result.skills,
        subtasks: result.subtasks.map((st: any) => ({
          ...st,
          id: Math.random().toString(36).substr(2, 9),
          progress: 0,
          status: 'pending'
        }))
      };

      useStore.addProject(project);
      setState(useStore.getData());
      setIsModalOpen(false);
      setNewProject({ name: '', description: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const focusOnProject = (project: Project) => {
    setMapCenter(project.coordinates);
    setMapZoom(18);
  };

  const triggerAlert = (type: 'stuck' | 'disagreement') => {
    const msg = type === 'stuck' 
      ? "警告：某同学在前端项目中卡壳超过 24 小时" 
      : "提示：AI 客户对需求理解出现严重分歧，需人类教授介入";
    setAlerts(prev => [...prev, msg]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a !== msg)), 5000);
  };

  // Keyboard shortcuts for demo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') triggerAlert('stuck');
      if (e.ctrlKey && e.key === '2') triggerAlert('disagreement');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-full bg-[#f8f9fa]">
      {/* Sidebar / Project List */}
      <div className="w-1/2 p-6 overflow-y-auto border-r border-black/5">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        <div className="space-y-4">
          {state.projects.map(project => (
            <div 
              key={project.id}
              className="bg-white p-5 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedProject(project)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{project.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {project.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-black transition-all duration-500" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-mono font-medium">{project.progress}%</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex -space-x-2">
                  {project.subtasks.map(st => {
                    const emp = state.employees.find(e => e.id === st.assignedEmployeeId);
                    return (
                      <div key={st.id} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={emp?.name}>
                        {emp?.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    );
                  })}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); focusOnProject(project); }}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black"
                >
                  <MapPin size={14} />
                  Current Location
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map View */}
      <div className="w-1/2 relative">
        <MapComponent 
          center={mapCenter} 
          zoom={mapZoom} 
          markers={state.projects.map(p => ({
            position: p.coordinates,
            title: p.name,
            content: (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="font-mono">{p.progress}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{p.subtasks.length} Members</span>
                </div>
                <div className="text-[10px] text-gray-400">AI Agents: PM, Mentor</div>
              </div>
            )
          }))}
        />

        {/* Floating Alerts */}
        <div className="absolute top-4 right-4 space-y-2 z-[1000]">
          <AnimatePresence>
            {alerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border-l-4 border-amber-500 p-4 shadow-lg rounded-r-lg flex items-start gap-3 max-w-xs"
              >
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <p className="text-sm font-medium text-gray-800">{alert}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h2 className="text-xl font-bold">{selectedProject.name}</h2>
                <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-black">✕</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedProject.description}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Subtasks</h4>
                  <div className="space-y-3">
                    {selectedProject.subtasks.map(st => {
                      const emp = state.employees.find(e => e.id === st.assignedEmployeeId);
                      return (
                        <div key={st.id} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm">{st.title}</p>
                            <p className="text-xs text-gray-500">Assigned to: {emp?.name}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${st.progress}%` }} />
                            </div>
                            <span className="text-xs font-mono">{st.progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-6">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    className="w-full p-3 rounded-xl border border-black/5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. AI Campus Guide"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Description</label>
                  <textarea 
                    value={newProject.description}
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                    className="w-full p-3 rounded-xl border border-black/5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black h-32"
                    placeholder="Describe the project goals and requirements..."
                  />
                </div>
                <button 
                  onClick={handleAddProject}
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing & Assigning...
                    </>
                  ) : 'Launch Project'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
