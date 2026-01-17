import { useState, useEffect } from 'react';
import './WorkspaceViewer.css';

interface WorkspaceViewerProps {
    taskId: string;
}

interface WorkspaceFile {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
}

interface WorkspaceData {
    exists: boolean;
    files: WorkspaceFile[];
    path: string | null;
    folderName?: string;
}

function WorkspaceViewer({ taskId }: WorkspaceViewerProps) {
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['src', 'tests']));

    useEffect(() => {
        fetchWorkspace();
        const interval = setInterval(fetchWorkspace, 5000);
        return () => clearInterval(interval);
    }, [taskId]);

    const fetchWorkspace = async () => {
        try {
            const response = await fetch(`/api/workspace/${taskId}`);
            const data = await response.json();
            if (data.success) {
                setWorkspace(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch workspace:', error);
        }
    };

    const viewFile = async (file: WorkspaceFile) => {
        if (file.type === 'directory') {
            // Toggle directory expansion
            setExpanded(prev => {
                const next = new Set(prev);
                if (next.has(file.path)) {
                    next.delete(file.path);
                } else {
                    next.add(file.path);
                }
                return next;
            });
            return;
        }

        setSelectedFile(file);
        setLoading(true);

        try {
            const response = await fetch(`/api/workspace/${taskId}/file/${file.path}`);
            const text = await response.text();
            setFileContent(text);
        } catch (error) {
            setFileContent('Failed to load file content');
            console.error('Failed to load file:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadWorkspace = async () => {
        setDownloading(true);
        try {
            const response = await fetch(`/api/workspace/${taskId}/download`);
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workspace-${taskId.slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download workspace:', error);
        } finally {
            setDownloading(false);
        }
    };

    const getFileIcon = (file: WorkspaceFile) => {
        if (file.type === 'directory') {
            return expanded.has(file.path) ? '📂' : '📁';
        }

        const ext = file.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts':
            case 'tsx':
                return '📘';
            case 'js':
            case 'jsx':
                return '📒';
            case 'json':
                return '📋';
            case 'md':
                return '📝';
            case 'css':
                return '🎨';
            default:
                return '📄';
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Build tree structure from flat file list
    const buildFileTree = (files: WorkspaceFile[]) => {
        const tree: { [key: string]: WorkspaceFile[] } = { '': [] };

        for (const file of files) {
            const parts = file.path.split(/[/\\]/);
            if (parts.length === 1) {
                tree[''].push(file);
            } else {
                const parent = parts.slice(0, -1).join('/');
                if (!tree[parent]) tree[parent] = [];
                tree[parent].push(file);
            }
        }

        return tree;
    };

    const renderFileTree = (files: WorkspaceFile[], depth = 0) => {
        const tree = buildFileTree(files);
        const rootFiles = tree[''] || [];

        return rootFiles.map((file) => {
            const isDir = file.type === 'directory';
            const isExpanded = expanded.has(file.path);
            const children = files.filter(f =>
                f.path.startsWith(file.path + '/') &&
                f.path.split('/').length === file.path.split('/').length + 1
            );

            return (
                <div key={file.path}>
                    <div
                        className={`workspace-file ${selectedFile?.path === file.path ? 'selected' : ''}`}
                        style={{ paddingLeft: `${12 + depth * 16}px` }}
                        onClick={() => viewFile(file)}
                    >
                        <span className="file-icon">{getFileIcon(file)}</span>
                        <span className="file-name">{file.name}</span>
                        {file.size && <span className="file-size">{formatSize(file.size)}</span>}
                    </div>
                    {isDir && isExpanded && children.length > 0 && (
                        <div className="file-children">
                            {renderFileTree(children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (!workspace || !workspace.exists) {
        return (
            <div className="workspace-viewer" data-testid="workspace">
                <div className="workspace-header">
                    <h3>📦 Workspace</h3>
                </div>
                <div className="workspace-empty">
                    <p>No workspace files yet</p>
                </div>
            </div>
        );
    }

    // Get root level items only
    const rootItems = workspace.files.filter(f => !f.path.includes('/') && !f.path.includes('\\'));

    return (
        <div className="workspace-viewer" data-testid="workspace">
            <div className="workspace-header">
                <h3>📦 Workspace</h3>
                <button
                    className="btn btn-sm btn-download"
                    onClick={downloadWorkspace}
                    disabled={downloading}
                >
                    {downloading ? '⏳' : '⬇️'} Download ZIP
                </button>
            </div>

            <div className="workspace-info">
                <span className="folder-name">{workspace.folderName}</span>
                <span className="file-count">{workspace.files.filter(f => f.type === 'file').length} files</span>
            </div>

            <div className="workspace-files">
                {renderFileTree(rootItems)}
            </div>

            {selectedFile && selectedFile.type === 'file' && (
                <div className="file-preview">
                    <div className="preview-header">
                        <span className="preview-title">{selectedFile.name}</span>
                        <button
                            className="preview-close"
                            onClick={() => setSelectedFile(null)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="preview-content">
                        {loading ? (
                            <div className="preview-loading">Loading...</div>
                        ) : (
                            <pre className="preview-code">{fileContent}</pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceViewer;
