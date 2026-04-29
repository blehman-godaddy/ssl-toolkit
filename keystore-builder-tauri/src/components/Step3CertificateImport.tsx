import { useState } from 'react';
import { Project } from '../types';

interface Props {
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  goToNextStep: () => void;
}

function Step3CertificateImport({ project, updateProject, goToNextStep }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleSelectFile = async () => {
    const file = await window.electronAPI.selectFile([
      { name: 'Certificate Files', extensions: ['crt', 'cer', 'pem'] }
    ]);

    if (file) {
      updateProject({ certFile: file });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    // Note: In Electron, drag-and-drop doesn't give us file paths for security reasons
    // We need to use the file picker instead
    await handleSelectFile();
  };

  const handleContinue = () => {
    if (project.certFile) {
      goToNextStep();
    }
  };

  return (
    <div className="step-container">
      <h2 className="step-title">Step 3: Import Certificate</h2>
      <p className="step-description">
        Import the SSL certificate you received from GoDaddy.
      </p>

      <div className="info-box">
        <p>
          <strong>What to import:</strong> The certificate file from GoDaddy, typically named
          with a serial number (e.g., c4bdf38c962d5cea.crt).
        </p>
      </div>

      <div
        className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={handleSelectFile}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {project.certFile ? (
          <div>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</p>
            <p style={{ fontWeight: 600, color: '#4caf50' }}>Certificate Selected</p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.5rem', color: '#666' }}>
              {project.certFile}
            </p>
            <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#666' }}>
              Click to select a different file
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</p>
            <p style={{ fontWeight: 600 }}>Drop certificate file here</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#666' }}>
              or click to browse
            </p>
            <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#999' }}>
              Accepted formats: .crt, .cer, .pem
            </p>
          </div>
        )}
      </div>

      <div className="info-box" style={{ marginTop: '2rem' }}>
        <p>
          <strong>Note:</strong> The app includes the GoDaddy CA chain (gd_bundle-g2-g1.crt)
          automatically - no need to download it separately.
        </p>
      </div>

      {project.certFile && (
        <div className="button-group" style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary" onClick={handleContinue}>
            Continue to Create Keystore →
          </button>
        </div>
      )}
    </div>
  );
}

export default Step3CertificateImport;
