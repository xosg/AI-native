import { Project, Employee, Subtask } from './services/gemini';

const STORAGE_KEY = 'digitized_uni_data';

export interface AppState {
  projects: Project[];
  employees: Employee[];
  currentUserRole: 'admin' | 'employee';
  currentEmployeeId?: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp1', name: 'Alice Chen', skills: ['React', 'TypeScript', 'Tailwind'] },
  { id: 'emp2', name: 'Bob Smith', skills: ['Node.js', 'Express', 'PostgreSQL'] },
  { id: 'emp3', name: 'Charlie Davis', skills: ['Python', 'Machine Learning', 'Data Science'] },
  { id: 'emp4', name: 'Diana Prince', skills: ['UI/UX Design', 'Figma', 'CSS'] },
];

export const useStore = {
  getData: (): AppState => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    return {
      projects: [],
      employees: INITIAL_EMPLOYEES,
      currentUserRole: 'admin'
    };
  },

  saveData: (state: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  addProject: (project: Project) => {
    const state = useStore.getData();
    state.projects.push(project);
    // Update employees status
    project.subtasks.forEach(st => {
      const emp = state.employees.find(e => e.id === st.assignedEmployeeId);
      if (emp) {
        emp.currentProjectId = project.id;
        emp.currentSubtaskId = st.id;
      }
    });
    useStore.saveData(state);
  },

  updateSubtaskProgress: (projectId: string, subtaskId: string, progress: number) => {
    const state = useStore.getData();
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      const subtask = project.subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        subtask.progress = progress;
        if (progress === 100) {
          subtask.status = 'completed';
        } else if (progress > 0) {
          subtask.status = 'in-progress';
        }
        
        // Update project overall progress
        const totalProgress = project.subtasks.reduce((acc, curr) => acc + curr.progress, 0);
        project.progress = Math.round(totalProgress / project.subtasks.length);
        
        if (project.progress === 100) {
          project.status = 'completed';
          // Free up employees
          project.subtasks.forEach(st => {
            const emp = state.employees.find(e => e.id === st.assignedEmployeeId);
            if (emp) {
              emp.currentProjectId = undefined;
              emp.currentSubtaskId = undefined;
            }
          });
        }
      }
    }
    useStore.saveData(state);
  }
};
