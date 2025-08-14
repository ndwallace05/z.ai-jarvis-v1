'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Calendar, 
  Mail, 
  Search, 
  Settings, 
  CheckSquare, 
  Mic, 
  Volume2,
  Bot,
  User,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar as CalendarIcon,
  Users,
  Bell,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useEvents } from '@/hooks/use-events';
import { useEmails } from '@/hooks/use-emails';
import { useSearch } from '@/hooks/use-search';
import { TaskDialog } from '@/components/TaskDialog';
import { EventDialog } from '@/components/EventDialog';
import { EmailDialog } from '@/components/EmailDialog';
import { ResearchDialog } from '@/components/ResearchDialog';
import { SettingsDialog } from '@/components/SettingsDialog';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'task_list' | 'calendar_view' | 'email_view' | 'document_view' | 'link';
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
  subtasks?: Task[];
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Email {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  status: 'DRAFT' | 'SENT' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

export default function JARVISInterface() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task management state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { 
    tasks, 
    archivedTasks, 
    loading: tasksLoading, 
    error: tasksError, 
    addTask, 
    updateTask, 
    deleteTask, 
    archiveTask, 
    unarchiveTask, 
    createSubtasks, 
    createFollowups 
  } = useTasks('demo-user');

  // Calendar management state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { events, loading: eventsLoading, error: eventsError, addEvent, updateEvent, deleteEvent } = useEvents('demo-user');

  // Email management state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);
  const { emails, loading: emailsLoading, error: emailsError, addEmail, updateEmail, deleteEmail, sendEmail } = useEmails('demo-user');

  // Research management state
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const { searches, loading: searchesLoading, error: searchesError, performSearch, deleteSearch } = useSearch('demo-user');

  // Settings management state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `${getGreeting()}, Sir/Madam. I'm JARVIS, your personal AI assistant. How may I assist you today?`,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Process the command through the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          userId: 'demo-user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.content,
        timestamp: new Date(),
        type: data.type
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, Sir/Madam. I encountered an error while processing your request.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // In a real implementation, this would use the Web Speech API
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Task management functions
  const handleAddTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await addTask(taskData);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await archiveTask(taskId);
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
  };

  const handleUnarchiveTask = async (taskId: string) => {
    try {
      await unarchiveTask(taskId);
    } catch (error) {
      console.error('Failed to unarchive task:', error);
    }
  };

  const handleCreateSubtasks = async (taskId: string) => {
    try {
      await createSubtasks(taskId);
    } catch (error) {
      console.error('Failed to create subtasks:', error);
    }
  };

  const handleCreateFollowups = async (taskId: string) => {
    try {
      await createFollowups(taskId);
    } catch (error) {
      console.error('Failed to create follow-up tasks:', error);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Calendar management functions
  const handleAddEvent = () => {
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await addEvent(eventData);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Email management functions
  const handleAddEmail = () => {
    setEditingEmail(null);
    setEmailDialogOpen(true);
  };

  const handleEditEmail = (email: Email) => {
    setEditingEmail(email);
    setEmailDialogOpen(true);
  };

  const handleSaveEmail = async (emailData: any) => {
    try {
      if (editingEmail) {
        await updateEmail(editingEmail.id, emailData);
      } else {
        await addEmail(emailData);
      }
    } catch (error) {
      console.error('Failed to save email:', error);
    }
  };

  const handleSendEmail = async (emailId: string) => {
    try {
      await sendEmail(emailId);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      await deleteEmail(emailId);
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  // Research management functions
  const handleNewSearch = () => {
    setResearchDialogOpen(true);
  };

  const handlePerformSearch = async (query: string) => {
    try {
      await performSearch(query);
    } catch (error) {
      console.error('Failed to perform search:', error);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await deleteSearch(searchId);
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              J.A.R.V.I.S.
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Just A Rather Very Intelligent System
          </p>
        </div>

        {/* Main Interface */}
        <Card className="shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="research" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Research</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="p-6">
              <div className="flex flex-col h-[600px]">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVoiceInput}
                    className={isListening ? 'bg-red-100 border-red-300' : ''}
                  >
                    <Mic className={`h-4 w-4 ${isListening ? 'text-red-600' : ''}`} />
                  </Button>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message to JARVIS..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Task Management</h2>
                  <Button onClick={handleAddTask}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
                
                {tasksError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{tasksError}</p>
                  </div>
                )}
                
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {tasks.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <CheckSquare className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                            No tasks yet
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Get started by creating your first task. JARVIS will help you break it down and estimate completion time.
                          </p>
                          <Button onClick={handleAddTask}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Create Task
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      tasks.map((task) => (
                        <Card key={task.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium">{task.title}</h3>
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                  <Badge className={getStatusColor(task.status)}>
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                  {task.aiEstimate && (
                                    <Badge variant="outline" className="text-xs">
                                      AI: {formatTime(task.aiEstimate)}
                                    </Badge>
                                  )}
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {task.description}
                                  </p>
                                )}
                                
                                {/* Time and Date Information */}
                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-2">
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {task.estimatedTime && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Est: {formatTime(task.estimatedTime)}
                                    </div>
                                  )}
                                  {task.reminderTime && (
                                    <div className="flex items-center gap-1">
                                      <Bell className="h-3 w-3" />
                                      Reminder: {new Date(task.reminderTime).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                
                                {/* AI Suggestions */}
                                {(task.aiBreakdown || task.aiFollowups) && (
                                  <div className="mt-3 space-y-2">
                                    {task.aiBreakdown && (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCreateSubtasks(task.id)}
                                          className="text-xs"
                                        >
                                          Create Subtasks
                                        </Button>
                                        <span className="text-xs text-slate-500">
                                          AI-suggested breakdown available
                                        </span>
                                      </div>
                                    )}
                                    
                                    {task.aiFollowups && (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCreateFollowups(task.id)}
                                          className="text-xs"
                                        >
                                          Create Follow-ups
                                        </Button>
                                        <span className="text-xs text-slate-500">
                                          AI-suggested follow-up tasks available
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Subtasks */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                      Subtasks:
                                    </div>
                                    {task.subtasks.map((subtask) => (
                                      <div key={subtask.id} className="flex items-center gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${
                                          subtask.status === 'COMPLETED' ? 'bg-green-500' :
                                          subtask.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                          'bg-slate-300'
                                        }`}></div>
                                        <span className="text-slate-600 dark:text-slate-400">
                                          {subtask.title}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditTask(task)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleToggleTaskStatus(task)}
                                >
                                  {task.status === 'COMPLETED' ? 'Reopen' : 'Complete'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleArchiveTask(task.id)}
                                  className="text-yellow-600 hover:text-yellow-700"
                                >
                                  Archive
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    
                    {/* Archived Tasks Section */}
                    {archivedTasks.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                            Archived Tasks ({archivedTasks.length})
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowArchived(!showArchived)}
                          >
                            {showArchived ? 'Hide' : 'Show'} Archived
                          </Button>
                        </div>
                        
                        {showArchived && (
                          <div className="grid gap-4">
                            {archivedTasks.map((task) => (
                              <Card key={task.id} className="opacity-75">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-medium text-slate-600 dark:text-slate-400">
                                          {task.title}
                                        </h3>
                                        <Badge variant="outline">
                                          Archived
                                        </Badge>
                                        <Badge className={getStatusColor(task.status)}>
                                          {task.status.replace('_', ' ')}
                                        </Badge>
                                      </div>
                                      
                                      {task.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-500 mb-2">
                                          {task.description}
                                        </p>
                                      )}
                                      
                                      <div className="text-xs text-slate-400">
                                        Completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleUnarchiveTask(task.id)}
                                      >
                                        Restore
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Calendar</h2>
                  <Button onClick={handleAddEvent}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
                
                {eventsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{eventsError}</p>
                  </div>
                )}
                
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                            No events scheduled
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Get started by creating your first event.
                          </p>
                          <Button onClick={handleAddEvent}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Create Event
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {events.map((event) => (
                          <Card key={event.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-medium">{event.title}</h3>
                                  </div>
                                  {event.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                      {event.description}
                                    </p>
                                  )}
                                  <div className="space-y-1 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleTimeString()}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {event.location}
                                      </div>
                                    )}
                                    {event.attendees && event.attendees.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditEvent(event)}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Email Management</h2>
                  <Button onClick={handleAddEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Compose
                  </Button>
                </div>
                
                {emailsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{emailsError}</p>
                  </div>
                )}
                
                {emailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emails.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Mail className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                            No emails yet
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Get started by composing your first email.
                          </p>
                          <Button onClick={handleAddEmail}>
                            <Mail className="h-4 w-4 mr-2" />
                            Compose Email
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {emails.map((email) => (
                          <Card key={email.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-medium">{email.subject}</h3>
                                    <Badge className={
                                      email.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                      email.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }>
                                      {email.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="font-medium">To:</span>
                                      {email.recipients.join(', ')}
                                    </div>
                                    {email.cc && email.cc.length > 0 && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="font-medium">CC:</span>
                                        {email.cc.join(', ')}
                                      </div>
                                    )}
                                    {email.bcc && email.bcc.length > 0 && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="font-medium">BCC:</span>
                                        {email.bcc.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-3">
                                    {email.body}
                                  </p>
                                  
                                  <div className="text-xs text-slate-500">
                                    Created: {new Date(email.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditEmail(email)}
                                  >
                                    Edit
                                  </Button>
                                  {email.status === 'DRAFT' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSendEmail(email.id)}
                                    >
                                      Send
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteEmail(email.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Research Tab */}
            <TabsContent value="research" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Research Assistant</h2>
                  <Button onClick={handleNewSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    New Search
                  </Button>
                </div>
                
                {searchesError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{searchesError}</p>
                  </div>
                )}
                
                {searchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searches.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Search className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                            No research history yet
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Get started by performing your first web search.
                          </p>
                          <Button onClick={handleNewSearch}>
                            <Search className="h-4 w-4 mr-2" />
                            Start Research
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {searches.map((search) => (
                          <Card key={search.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base">{search.query}</CardTitle>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteSearch(search.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Search className="h-3 w-3" />
                                  <span>{search.results.length} results found</span>
                                  <span>•</span>
                                  <span>{new Date(search.createdAt).toLocaleString()}</span>
                                </div>
                                
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Top Results:</h4>
                                  <div className="space-y-2">
                                    {search.results.slice(0, 3).map((result, index) => (
                                      <div key={result.url} className="flex items-start gap-2 text-sm">
                                        <span className="text-slate-500 mt-0.5">{index + 1}.</span>
                                        <div className="flex-1">
                                          <div className="font-medium text-slate-900 dark:text-slate-100">
                                            {result.name}
                                          </div>
                                          <div className="text-slate-600 dark:text-slate-400">
                                            {result.host_name}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {search.summary && (
                                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <h4 className="font-medium text-sm mb-1">Summary:</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {search.summary}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Settings</h2>
                  <Button onClick={() => setSettingsDialogOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Settings
                  </Button>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        JARVIS Personality
                      </CardTitle>
                      <CardDescription>
                        Customize JARVIS personality and behavior
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Formality Level</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-500">Casual</span>
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                          </div>
                          <span className="text-sm text-slate-500">Formal</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Humor Level</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-500">Serious</span>
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                          <span className="text-sm text-slate-500">Witty</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">British Accent</label>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Quick API Setup
                      </CardTitle>
                      <CardDescription>
                        Essential API keys for JARVIS functionality
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Z.ai GLM 4.5 Flash</div>
                            <div className="text-xs text-slate-500">AI processing engine</div>
                          </div>
                          <Badge variant="outline">Not configured</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Google Calendar</div>
                            <div className="text-xs text-slate-500">Event management</div>
                          </div>
                          <Badge variant="outline">Not configured</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Google Email</div>
                            <div className="text-xs text-slate-500">Email integration</div>
                          </div>
                          <Badge variant="outline">Not configured</Badge>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSettingsDialogOpen(true)}
                      >
                        Configure All APIs
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">8</div>
                        <div className="text-sm text-slate-500">Active Agents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">156</div>
                        <div className="text-sm text-slate-500">Commands Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">99.2%</div>
                        <div className="text-sm text-slate-500">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Task Dialog */}
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={editingTask}
          onSave={handleSaveTask}
          isEditing={!!editingTask}
        />
        
        {/* Event Dialog */}
        <EventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          event={editingEvent}
          onSave={handleSaveEvent}
          isEditing={!!editingEvent}
        />
        
        {/* Email Dialog */}
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          email={editingEmail}
          onSave={handleSaveEmail}
          onSend={handleSendEmail}
          isEditing={!!editingEmail}
        />
        
        {/* Research Dialog */}
        <ResearchDialog
          open={researchDialogOpen}
          onOpenChange={setResearchDialogOpen}
          onSearch={handlePerformSearch}
          isSearching={searchesLoading}
        />
        
        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          userId="demo-user"
        />
      </div>
    </div>
  );
}