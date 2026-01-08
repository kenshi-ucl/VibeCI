import { useState, useEffect } from 'react';
import './ArtifactViewer.css';

interface ArtifactViewerProps {
    taskId: string;
}

interface Artifact {
    id: string;
    taskId: string;
    type: 'log' | 'diff' | 'screenshot' | 'report';
    name: string;
    path: string;
    createdAt: string;
}

function ArtifactViewer({ taskId }: ArtifactViewerProps) {
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchArtifacts();
        const interval = setInterval(fetchArtifacts, 5000);
        return () => clearInterval(interval);
    }, [taskId]);

    const fetchArtifacts = async () => {
        try {
            const response = await fetch(`/api/tasks/${taskId}/artifacts`);
            const data = await response.json();
            if (data.success) {
                setArtifacts(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch artifacts:', error);
        }
    };

    const viewArtifact = async (artifact: Artifact) => {
        setSelectedArtifact(artifact);
        setLoading(true);

        try {
            const filename = artifact.path.split(/[/\\]/).pop();
            const response = await fetch(`/api/artifacts/${taskId}/${filename}`);
            const text = await response.text();
            setContent(text);
        } catch (error) {
            setContent('Failed to load artifact content');
            console.error('Failed to load artifact:', error);
        } finally {
            setLoading(false);
        }
    };

    const getArtifactIcon = (type: string) => {
        switch (type) {
            case 'log':
                return '📄';
            case 'diff':
                return '📝';
            case 'screenshot':
                return '📸';
            case 'report':
                return '📊';
            default:
                return '📁';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="artifact-viewer" data-testid="artifacts">
            <div className="artifact-header">
                <h3>Artifacts</h3>
                <span className="artifact-count">{artifacts.length}</span>
            </div>

            <div className="artifact-list">
                {artifacts.length === 0 ? (
                    <div className="artifact-empty">
                        <p>No artifacts yet</p>
                    </div>
                ) : (
                    artifacts.map((artifact) => (
                        <div
                            key={artifact.id}
                            className={`artifact-item ${selectedArtifact?.id === artifact.id ? 'selected' : ''}`}
                            onClick={() => viewArtifact(artifact)}
                        >
                            <span className="artifact-icon">{getArtifactIcon(artifact.type)}</span>
                            <div className="artifact-info">
                                <span className="artifact-name">{artifact.name}</span>
                                <span className="artifact-time">{formatDate(artifact.createdAt)}</span>
                            </div>
                            <span className={`artifact-type badge badge-${artifact.type === 'report' ? 'success' : 'pending'}`}>
                                {artifact.type}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {selectedArtifact && (
                <div className="artifact-preview">
                    <div className="preview-header">
                        <span className="preview-title">{selectedArtifact.name}</span>
                        <button
                            className="preview-close"
                            onClick={() => setSelectedArtifact(null)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="preview-content">
                        {loading ? (
                            <div className="preview-loading">Loading...</div>
                        ) : (
                            <pre className="preview-code">{content}</pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ArtifactViewer;
