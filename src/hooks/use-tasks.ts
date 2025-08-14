'use client';

import { useState, useEffect } from 'react';

interface Subtask {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Enhanced features
  estimatedTime?: number;
  actualTime?: number;
  reminderTime?: string;
  isArchived?: boolean;
  archivedAt?: string;
  reminderSent?: boolean;
  
  // AI features
  aiBreakdown?: string;
  aiFollowups?: string;
  aiEstimate?: number;
  
  // Subtasks
  subtasks?: Subtask[];
}

interface UseTasksReturn {
  tasks: Task[];
  archivedTasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  unarchiveTask: (id: string) => Promise<void>;
  createSubtasks: (id: string) => Promise<void>;
  createFollowups: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshArchivedTasks: () => Promise<void>;
}

export function useTasks(userId: string): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/archived?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch archived tasks');
      }
      
      const data = await response.json();
      setArchivedTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...taskData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const data = await response.json();
      setTasks(prev => [data.task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const data = await response.json();
      
      // Update in the appropriate list
      setTasks(prev => prev.map(task => 
        task.id === id ? data.task : task
      ));
      
      setArchivedTasks(prev => prev.map(task => 
        task.id === id ? data.task : task
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev => prev.filter(task => task.id !== id));
      setArchivedTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const archiveTask = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'archive',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive task');
      }

      const data = await response.json();
      
      // Move from active to archived
      setTasks(prev => prev.filter(task => task.id !== id));
      setArchivedTasks(prev => [data.task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unarchiveTask = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'unarchive',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unarchive task');
      }

      const data = await response.json();
      
      // Move from archived to active
      setArchivedTasks(prev => prev.filter(task => task.id !== id));
      setTasks(prev => [data.task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSubtasks = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'create_subtasks',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subtasks');
      }

      // Refresh tasks to show new subtasks
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createFollowups = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'create_followups',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create follow-up tasks');
      }

      // Refresh tasks to show new follow-ups
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTasks();
      fetchArchivedTasks();
    }
  }, [userId]);

  return {
    tasks,
    archivedTasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    createSubtasks,
    createFollowups,
    refreshTasks: fetchTasks,
    refreshArchivedTasks: fetchArchivedTasks,
  };
}