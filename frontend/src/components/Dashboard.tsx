import TaskForm from './TaskForm';
import './Dashboard.css';

interface DashboardProps {
    tasks: Task[];
    onSelectTask: (task: Task) => void;
    onTaskCreated: (task: Task) => void;
}

interface Task {
    id: string;
    description: string;
    status: string;
    currentIteration: number;
    maxIterations: number;
    createdAt: string;
}

function Dashboard({ tasks, onSelectTask, onTaskCreated }: DashboardProps) {
    const getStatusBadge = (status: string) => {
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
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        running: tasks.filter(t => ['pending', 'planning', 'generating', 'testing', 'analyzing', 'fixing'].includes(t.status)).length,
        failed: tasks.filter(t => t.status === 'failed').length,
    };

    return (
        <div className="dashboard">
            <section className="dashboard-hero">
                <h1>
                    <span className="gradient-text">VibeCI</span>
                </h1>
                <p className="hero-subtitle">
                    Autonomous Code Engineer — writes, tests, debugs, and ships verified code changes
                </p>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Tasks</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-value">{stats.completed}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-value">{stats.running}</div>
                        <div className="stat-label">Running</div>
                    </div>
                    <div className="stat-card error">
                        <div className="stat-value">{stats.failed}</div>
                        <div className="stat-label">Failed</div>
                    </div>
                </div>
            </section>

            <div className="dashboard-content">
                <div className="dashboard-main">
                    <TaskForm onTaskCreated={onTaskCreated} />
                </div>

                <div className="dashboard-sidebar">
                    <div className="recent-tasks">
                        <h3>Recent Tasks</h3>

                        {tasks.length === 0 ? (
                            <div className="no-tasks">
                                <p>No tasks yet</p>
                                <p className="text-muted">Create your first task to get started</p>
                            </div>
                        ) : (
                            <div className="task-list">
                                {tasks.slice(0, 10).map((task) => (
                                    <div
                                        key={task.id}
                                        className="task-item"
                                        data-testid="task-item"
                                        onClick={() => onSelectTask(task)}
                                    >
                                        <div className="task-item-header">
                                            <span className={`badge badge-${getStatusBadge(task.status)}`}>
                                                {task.status}
                                            </span>
                                            <span className="task-time">{formatDate(task.createdAt)}</span>
                                        </div>
                                        <p className="task-description">{task.description}</p>
                                        <div className="task-meta">
                                            <span>Iterations: {task.currentIteration}/{task.maxIterations}</span>
                                            <span className="task-id">{task.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
