import { useState } from 'react';
import './TaskForm.css';

interface TaskFormProps {
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

function TaskForm({ onTaskCreated }: TaskFormProps) {
    const [description, setDescription] = useState('');
    const [maxIterations, setMaxIterations] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            setError('Please enter a task description');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: description.trim(),
                    maxIterations,
                }),
            });

            const data = await response.json();

            if (data.success) {
                onTaskCreated(data.data);
                setDescription('');
            } else {
                setError(data.error || 'Failed to create task');
            }
        } catch (err) {
            setError('Failed to connect to server');
            console.error('Submit error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const exampleTasks = [
        'Add email-based signup with rate limiting',
        'Implement password reset functionality',
        'Add user profile update endpoint',
        'Create unit tests for authentication service',
    ];

    return (
        <div className="task-form-container">
            <div className="task-form-header">
                <h2>New Task</h2>
                <p className="text-secondary">
                    Describe the code change you want VibeCI to implement
                </p>
            </div>

            <form onSubmit={handleSubmit} className="task-form">
                <div className="form-group">
                    <label htmlFor="description" className="label">
                        Task Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        className="textarea"
                        placeholder="Describe what you want to implement..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="iterations" className="label">
                        Max Iterations
                    </label>
                    <div className="iterations-control">
                        {[1, 2, 3, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`iteration-btn ${maxIterations === n ? 'active' : ''}`}
                                onClick={() => setMaxIterations(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted text-sm mt-sm">
                        Number of fix attempts if tests fail
                    </p>
                </div>

                {error && (
                    <div className="error-message" data-testid="error">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <span className="spinner"></span>
                            Starting Task...
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            Start Autonomous Task
                        </>
                    )}
                </button>
            </form>

            <div className="example-tasks">
                <p className="example-label">Example tasks:</p>
                <div className="example-list">
                    {exampleTasks.map((task, i) => (
                        <button
                            key={i}
                            className="example-btn"
                            onClick={() => setDescription(task)}
                        >
                            {task}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TaskForm;
