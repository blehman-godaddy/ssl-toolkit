import { useState } from 'react';
import { FileInfo } from '../types';

function CleanupTool() {
  const [scanDir, setScanDir] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      setScanDir(dir);
      setFiles([]);
      setSelectedFiles(new Set());
      setError('');
      setMessage('');
    }
  };

  const handleScan = async () => {
    if (!scanDir) return;

    setIsScanning(true);
    setError('');
    setMessage('');

    try {
      const extensions = ['.key', '.csr', '.jks', '.p12', '.pfx'];
      const result = await window.electronAPI.listFiles(scanDir, extensions);

      if (result.success) {
        setFiles(result.files);
        if (result.files.length === 0) {
          setMessage('No certificate files found in this directory.');
        }
      } else {
        setError(result.error || 'Failed to scan directory');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.path)));
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedFiles.size} file(s)?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError('');

    let successCount = 0;
    let failCount = 0;

    for (const filePath of selectedFiles) {
      const result = await window.electronAPI.deleteFile(filePath);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsDeleting(false);

    if (failCount === 0) {
      setMessage(`Successfully deleted ${successCount} file(s).`);
    } else {
      setError(`Deleted ${successCount} file(s), but ${failCount} failed.`);
    }

    // Rescan after deletion
    await handleScan();
    setSelectedFiles(new Set());
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileType = (filename: string): string => {
    if (filename.endsWith('.key')) return '🔑 Private Key';
    if (filename.endsWith('.csr')) return '📄 CSR';
    if (filename.endsWith('.jks')) return '🔐 JKS Keystore';
    if (filename.endsWith('.p12')) return '🔐 P12 Keystore';
    if (filename.endsWith('.pfx')) return '🔐 PFX Keystore';
    return '📁 File';
  };

  return (
    <div className="step-container">
      <h2 className="step-title">Cleanup Certificate Files</h2>
      <p className="step-description">
        Scan a directory for certificate files and safely delete old or unwanted files.
      </p>

      <div className="form-group">
        <label htmlFor="scanDir">Directory to Scan</label>
        <div className="input-with-button">
          <input
            id="scanDir"
            type="text"
            placeholder="/path/to/certificates"
            value={scanDir}
            readOnly
          />
          <button className="btn btn-secondary" onClick={handleSelectDirectory}>
            Browse
          </button>
        </div>
      </div>

      {scanDir && (
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? 'Scanning...' : 'Scan Directory'}
          </button>
        </div>
      )}

      {error && (
        <div className="error-box" style={{ marginTop: '1rem' }}>
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="info-box" style={{ marginTop: '1rem' }}>
          <p>{message}</p>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600 }}>
                Found {files.length} file(s) - {selectedFiles.size} selected
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleSelectAll}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                >
                  Select All
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleClearSelection}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {files.map((file) => (
                <div
                  key={file.path}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    background: selectedFiles.has(file.path) ? '#f0f2ff' : 'white',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => handleToggleFile(file.path)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => handleToggleFile(file.path)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                      {getFileType(file.name)} - {file.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {formatFileSize(file.size)} • Modified: {formatDate(file.modified)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                      {file.path}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <div className="button-group" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' }}
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedFiles.size} Selected File(s)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CleanupTool;
