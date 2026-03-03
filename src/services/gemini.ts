import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCAt2APWvLygVavTeaD_WIAABltqmn47Xc";
const genAI = new GoogleGenAI({ apiKey: API_KEY });

export interface Subtask {
  id: string;
  title: string;
  description: string;
  assignedEmployeeId: string;
  progress: number;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'active' | 'completed';
  coordinates: [number, number];
  subtasks: Subtask[];
  skills: string[];
}

export interface Employee {
  id: string;
  name: string;
  skills: string[];
  currentProjectId?: string;
  currentSubtaskId?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export const geminiService = {
  async extractSkillsAndGenerateSubtasks(projectName: string, projectDescription: string, employees: Employee[]) {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Project Name: ${projectName}
      Project Description: ${projectDescription}
      
      Available Employees: ${JSON.stringify(employees.map(e => ({ id: e.id, name: e.name, skills: e.skills })))}
      
      Task:
      1. Extract 3-5 core technical skills required for this project.
      2. Divide the project into 2-3 logical subtasks.
      3. For each subtask, assign it to the most suitable idle employee from the list based on their skills.
      
      Return the result in JSON format.
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  assignedEmployeeId: { type: Type.STRING }
                },
                required: ["title", "description", "assignedEmployeeId"]
              }
            }
          },
          required: ["skills", "subtasks"]
        }
      }
    });

    return JSON.parse(response.text);
  },

  async chatWithAgent(agentType: 'PM' | 'Mentor', subtask: Subtask, history: Message[], userInput: string) {
    const model = "gemini-3-flash-preview";
    const systemInstruction = agentType === 'PM' 
      ? `You are Agent A, a strict and professional Product Manager. Your goal is to help the student understand the business requirements of their subtask: "${subtask.title}". Description: "${subtask.description}". If asked, generate a detailed Business Requirement Document (BRD). Be professional and demanding.`
      : `You are Agent B, a senior technical Mentor. Your goal is to answer technical questions, evaluate code quality, and help the student progress with their subtask: "${subtask.title}". Description: "${subtask.description}". Be encouraging but thorough in your technical reviews.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction
      }
    });

    return response.text;
  },

  async generateResumeEntry(project: Project, subtask: Subtask, chatHistory: Message[]) {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Project: ${project.name}
      Subtask: ${subtask.title}
      Subtask Description: ${subtask.description}
      Chat History Summary: ${chatHistory.slice(-5).map(m => m.text).join(' ')}
      
      Generate a professional and impressive resume bullet point or short paragraph summarizing the work done, the challenges overcome, and the skills applied.
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    });

    return response.text;
  }
};
