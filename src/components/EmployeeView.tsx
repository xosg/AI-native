import React, { useState, useEffect, useRef } from 'react';
import { Employee, Project, Subtask, Message, geminiService } from '../services/gemini';
import { useStore } from '../store';
import { Send, User, Bot, CheckCircle2, FileText, Code, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

export const EmployeeView: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const [state, setState] = useState(useStore.getData());
  const [activeTab, setActiveTab] = useState<'PM' | 'Mentor'>('PM');
  const [chatHistories, setChatHistories] = useState<{ PM: Message[], Mentor: Message[] }>({ PM: [], Mentor: [] });
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [resumeEntry, setResumeEntry] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const employee = state.employees.find(e => e.id === employeeId);
  const project = state.projects.find(p => p.id === employee?.currentProjectId);
  const subtask = project?.subtasks.find(s => s.id === employee?.currentSubtaskId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, activeTab]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || !subtask) return;

    const currentHistory = chatHistories[activeTab];
    const newUserMessage: Message = { role: 'user', text: userInput };
    
    setChatHistories(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newUserMessage]
    }));
    setUserInput('');
    setIsTyping(true);

    try {
      const response = await geminiService.chatWithAgent(activeTab, subtask, currentHistory, userInput);
      const modelMessage: Message = { role: 'model', text: response || '' };
      
      setChatHistories(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], modelMessage]
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const updateProgress = (newProgress: number) => {
    if (!project || !subtask) return;
    useStore.updateSubtaskProgress(project.id, subtask.id, newProgress);
    setState(useStore.getData());

    if (newProgress === 100) {
      generateResume();
    }
  };

  const generateResume = async () => {
    if (!project || !subtask) return;
    setIsTyping(true);
    try {
      const entry = await geminiService.generateResumeEntry(project, subtask, chatHistories.PM.concat(chatHistories.Mentor));
      setResumeEntry(entry || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  if (!subtask) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#f8f9fa] p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="text-gray-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Currently Idle</h2>
        <p className="text-gray-500 max-w-md">You haven't been assigned to any projects yet. Wait for the administrator to assign you a task based on your skills.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f8f9fa]">
      {/* Left Panel: Task Info */}
      <div className="w-1/3 p-6 border-r border-black/5 overflow-y-auto">
        <div className="mb-8">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Current Project</h4>
          <h2 className="text-xl font-bold text-gray-900">{project?.name}</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Subtask</h4>
          <h3 className="text-lg font-bold mb-3">{subtask.title}</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{subtask.description}</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-mono font-bold">{subtask.progress}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={subtask.progress}
              onChange={(e) => updateProgress(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
              <span>Started</span>
              <span>Completed</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => setActiveTab('PM')}
            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'PM' ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={20} />
            <div className="text-left">
              <p className="font-bold text-sm">Agent A (Product Manager)</p>
              <p className="text-[10px] opacity-70">Requirements & Business Logic</p>
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('Mentor')}
            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'Mentor' ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Code size={20} />
            <div className="text-left">
              <p className="font-bold text-sm">Agent B (Tech Mentor)</p>
              <p className="text-[10px] opacity-70">Technical Guidance & Code Review</p>
            </div>
          </button>
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {activeTab === 'PM' ? <FileText size={20} /> : <Code size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-sm">Chatting with {activeTab === 'PM' ? 'Agent A' : 'Agent B'}</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistories[activeTab].length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <Bot size={48} className="mb-4" />
              <p className="text-sm font-medium">Start a conversation with your AI {activeTab === 'PM' ? 'PM' : 'Mentor'}</p>
            </div>
          )}
          {chatHistories[activeTab].map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-50 text-gray-800'}`}>
                  <div className="markdown-body">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-black/5">
          <div className="relative">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Ask ${activeTab === 'PM' ? 'about requirements...' : 'a technical question...'}`}
              className="w-full p-4 pr-16 rounded-2xl border border-black/5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isTyping}
              className="absolute right-2 top-2 bottom-2 w-12 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors disabled:bg-gray-300"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Resume Entry Modal */}
      <AnimatePresence>
        {resumeEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Project Completed!</h2>
              <p className="text-gray-500 mb-8">Great job! Gemini has summarized your contribution for your resume:</p>
              
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl text-left mb-8 relative">
                <Sparkles className="absolute -top-3 -right-3 text-emerald-500" size={24} />
                <div className="markdown-body text-emerald-900 text-sm italic">
                  <Markdown>{resumeEntry}</Markdown>
                </div>
              </div>

              <button 
                onClick={() => setResumeEntry(null)}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
