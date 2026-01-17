import { useState, useEffect } from 'react';
import TaskForm from './components/TaskForm';
import TraceViewer from './components/TraceViewer';
import Dashboard from './components/Dashboard';
import ArtifactViewer from './components/ArtifactViewer';
import WorkspaceViewer from './components/WorkspaceViewer';
import './App.css';

// Types
interface Task {
    id: string;
    description: string;
    status: string;
    currentIteration: number;
    maxIterations: number;
    createdAt: string;
}

interface TaskEvent {
    id: string;
    taskId: string;
    type: string;
    message: string;
    data?: unknown;
    timestamp: string;
}

function App() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [events, setEvents] = useState<TaskEvent[]>([]);
    const [_ws, setWs] = useState<WebSocket | null>(null);
    const [view, setView] = useState<'dashboard' | 'task'>('dashboard');

    // Fetch tasks on mount
    useEffect(() => {
        fetchTasks();
    }, []);

    // WebSocket connection for selected task
    useEffect(() => {
        if (!selectedTask) return;

        const websocket = new WebSocket(`ws://${window.location.hostname}:3001/ws`);

        websocket.onopen = () => {
            console.log('WebSocket connected');
            websocket.send(JSON.stringify({ type: 'subscribe', taskId: selectedTask.id }));
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type !== 'subscribed') {
                setEvents(prev => [...prev, data as TaskEvent]);
                // Refresh task status
                fetchTask(selectedTask.id);
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, [selectedTask?.id]);

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            if (data.success) {
                setTasks(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    const fetchTask = async (taskId: string) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            const data = await response.json();
            if (data.success) {
                setSelectedTask(data.data);
                setTasks(prev => prev.map(t => t.id === taskId ? data.data : t));
            }
        } catch (error) {
            console.error('Failed to fetch task:', error);
        }
    };

    const fetchEvents = async (taskId: string) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}/events`);
            const data = await response.json();
            if (data.success) {
                setEvents(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };

    const handleTaskCreated = async (task: Task) => {
        setTasks(prev => [task, ...prev]);
        setSelectedTask(task);
        setEvents([]);
        setView('task');
        await fetchEvents(task.id);
    };

    const handleSelectTask = async (task: Task) => {
        setSelectedTask(task);
        setEvents([]);
        setView('task');
        await fetchEvents(task.id);
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        setSelectedTask(null);
        fetchTasks();
    };

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <div className="logo" onClick={handleBackToDashboard}>
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="logo-text">VibeCI</span>
                    </div>
                    <nav className="nav">
                        <button
                            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
                            onClick={handleBackToDashboard}
                        >
                            Dashboard
                        </button>
                        {selectedTask && (
                            <button className="nav-item active">
                                Task: {selectedTask.id.slice(0, 8)}
                            </button>
                        )}
                    </nav>
                    <div className="header-actions">
                        <span className="badge badge-success">
                            <span className="status-dot"></span>
                            Connected
                        </span>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {view === 'dashboard' ? (
                    <Dashboard
                        tasks={tasks}
                        onSelectTask={handleSelectTask}
                        onTaskCreated={handleTaskCreated}
                    />
                ) : selectedTask ? (
                    <div className="task-view">
                        <div className="task-view-header">
                            <button className="btn btn-secondary" onClick={handleBackToDashboard}>
                                ← Back to Dashboard
                            </button>
                            <h2>Task: {selectedTask.description.slice(0, 50)}...</h2>
                            <span className={`badge badge-${getStatusBadge(selectedTask.status)}`}>
                                {selectedTask.status}
                            </span>
                        </div>

                        <div className="task-view-content">
                            <div className="task-main">
                                <TraceViewer
                                    events={events}
                                    task={selectedTask}
                                />
                            </div>
                            <div className="task-sidebar">
                                <ArtifactViewer taskId={selectedTask.id} />
                                <WorkspaceViewer taskId={selectedTask.id} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Select a task or create a new one</p>
                    </div>
                )}
            </main>

            <footer className="app-footer">
                <p>VibeCI - Autonomous Code Engineer • Powered by Gemini</p>
            </footer>
        </div>
    );
}

function getStatusBadge(status: string): string {
    switch (status) {
        case 'pending':
        case 'planning':
            return 'pending';
        case 'generating':
        case 'testing':
        case 'analyzing':
        case 'fixing':
            return 'running';
        case 'completed':
            return 'success';
        case 'failed':
            return 'error';
        default:
            return 'pending';
    }
}

export default App;
