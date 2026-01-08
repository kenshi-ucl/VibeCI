import { useEffect, useRef } from 'react';
import './TraceViewer.css';

interface TraceViewerProps {
    events: TaskEvent[];
    task: Task;
}

interface TaskEvent {
    id: string;
    taskId: string;
    type: string;
    message: string;
    data?: unknown;
    timestamp: string;
}

interface Task {
    id: string;
    description: string;
    status: string;
    currentIteration: number;
    maxIterations: number;
    createdAt: string;
}

function TraceViewer({ events, task }: TraceViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new events
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'created':
                return '🚀';
            case 'status':
                return '⚡';
            case 'iteration':
                return '🔄';
            case 'plan':
                return '📋';
            case 'patches':
                return '✏️';
            case 'test-result':
                return '🧪';
            case 'analysis':
                return '🔍';
            case 'success':
                return '✅';
            case 'error':
            case 'errors':
                return '❌';
            case 'complete':
                return '🎉';
            default:
                return '📌';
        }
    };

    const getEventClass = (type: string) => {
        switch (type) {
            case 'success':
            case 'complete':
                return 'event-success';
            case 'error':
            case 'errors':
                return 'event-error';
            case 'iteration':
                return 'event-iteration';
            case 'test-result':
                return 'event-test';
            default:
                return '';
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const isRunning = ['pending', 'planning', 'generating', 'testing', 'analyzing', 'fixing'].includes(task.status);

    return (
        <div className="trace-viewer" data-testid="trace-viewer">
            <div className="trace-header">
                <h3>Execution Trace</h3>
                <div className="trace-meta">
                    <span className="iteration" data-testid="iteration">
                        Iteration {task.currentIteration} / {task.maxIterations}
                    </span>
                    {isRunning && (
                        <span className="running-indicator">
                            <span className="pulse-dot"></span>
                            Running
                        </span>
                    )}
                </div>
            </div>

            <div className="trace-content" ref={scrollRef}>
                {events.length === 0 ? (
                    <div className="trace-empty">
                        <p>Waiting for events...</p>
                        <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                ) : (
                    <div className="event-list">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className={`event-item ${getEventClass(event.type)} animate-slide-in`}
                            >
                                <div className="event-icon">
                                    {getEventIcon(event.type)}
                                </div>
                                <div className="event-content">
                                    <div className="event-header">
                                        <span className="event-type">{event.type}</span>
                                        <span className="event-time">{formatTime(event.timestamp)}</span>
                                    </div>
                                    <p className="event-message">{event.message}</p>
                                    {event.data ? (
                                        <EventData data={event.data} type={event.type} />
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="trace-footer">
                <span className="event-count">{events.length} events</span>
                <span className="task-id">Task: {task.id.slice(0, 8)}</span>
            </div>
        </div>
    );
}

function EventData({ data, type }: { data: unknown; type: string }) {
    if (!data || typeof data !== 'object') return null;

    const obj = data as Record<string, unknown>;

    // Special rendering for different event types
    if (type === 'plan' && Array.isArray(obj.plan)) {
        return (
            <div className="event-data plan-data">
                <ol className="plan-list">
                    {obj.plan.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                    ))}
                </ol>
            </div>
        );
    }

    if (type === 'test-result') {
        return (
            <div className={`event-data test-data ${obj.passed ? 'passed' : 'failed'}`}>
                <div className="test-stats">
                    <span className="stat">
                        <strong>{obj.passedCount as number}</strong> passed
                    </span>
                    <span className="stat">
                        <strong>{obj.failedCount as number}</strong> failed
                    </span>
                    <span className="stat">
                        <strong>{obj.total as number}</strong> total
                    </span>
                    <span className="stat">
                        <strong>{((obj.duration as number) / 1000).toFixed(1)}s</strong>
                    </span>
                </div>
            </div>
        );
    }

    if (type === 'patches' && obj.applied) {
        return (
            <div className="event-data patches-data">
                <p className="patches-summary">
                    Applied {(obj.applied as string[]).length} patch(es)
                </p>
                <ul className="file-list">
                    {(obj.applied as string[]).map((file: string, i: number) => (
                        <li key={i} className="code">{file}</li>
                    ))}
                </ul>
            </div>
        );
    }

    if (type === 'errors' && Array.isArray(obj.errors)) {
        return (
            <div className="event-data errors-data">
                {(obj.errors as string[]).slice(0, 2).map((error: string, i: number) => (
                    <pre key={i} className="error-block">{error}</pre>
                ))}
            </div>
        );
    }

    // Default: show as JSON
    return (
        <div className="event-data">
            <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}

export default TraceViewer;
