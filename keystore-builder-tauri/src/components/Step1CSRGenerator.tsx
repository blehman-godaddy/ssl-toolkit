import { useState } from 'react';
import { Project } from '../types';
import { filenameSafe } from '../utils/domain';

interface Props {
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  goToNextStep: () => void;
}

function Step1CSRGenerator({ project, updateProject, goToNextStep }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      updateProject({ outputDir: dir });
    }
  };

  const handleGenerateCSR = async () => {
    if (!project.domain || !project.outputDir) return;

    setIsGenerating(true);
    setOutput('');
    setError('');
    setSuccess(false);

    const fileStem = filenameSafe(project.domain);
    const keyFile = `${project.outputDir}/${fileStem}.key`;
    const csrFile = `${project.outputDir}/${fileStem}.csr`;

    try {
      // Use the secure Tauri command
      const result = await window.electronAPI.generateCSR(project.domain, project.outputDir);

      if (result.success) {
        // Verify files were created
        const keyExists = await window.electronAPI.fileExists(keyFile);
        const csrExists = await window.electronAPI.fileExists(csrFile);

        if (keyExists && csrExists) {
          updateProject({ keyFile, csrFile });
          setSuccess(true);
          const details = `/C=US/ST=Arizona/L=Tempe/O=${project.domain}/OU=IT/CN=${project.domain}`;
          setOutput(`Successfully generated:\n${keyFile}\n${csrFile}\n\nCertificate Details:\n${details}`);
        } else {
          setError('Files were not created. Please check the output directory permissions.');
        }
      } else {
        setError(result.error || result.stderr || 'Failed to generate CSR');
        setOutput(result.stderr || result.stdout || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCSR = async () => {
    if (!project.csrFile) return;

    const result = await window.electronAPI.readFile(project.csrFile);
    if (result.success && result.content) {
      await window.electronAPI.writeClipboard(result.content);
      alert('CSR copied to clipboard!');
    } else {
      alert('Failed to read CSR file: ' + result.error);
    }
  };

  const isValid = project.domain && project.outputDir;

  return (
    <div className="step-container">
      <h2 className="step-title">Step 1: Generate CSR</h2>
      <p className="step-description">
        Generate a Certificate Signing Request (CSR) and private key with standard GoDaddy details.
      </p>

      <div className="form-group">
        <label htmlFor="domain">Domain Name</label>
        <input
          id="domain"
          type="text"
          placeholder="www.example.com or *.example.com"
          value={project.domain}
          onChange={(e) => updateProject({ domain: e.target.value })}
          disabled={success}
        />
      </div>

      <div className="form-group">
        <label htmlFor="outputDir">Output Directory</label>
        <div className="input-with-button">
          <input
            id="outputDir"
            type="text"
            placeholder="/path/to/certificates"
            value={project.outputDir}
            readOnly
          />
          <button
            className="btn btn-secondary"
            onClick={handleSelectDirectory}
            disabled={success}
          >
            Browse
          </button>
        </div>
      </div>

      <div className="info-box">
        <p><strong>Certificate Details (auto-filled):</strong></p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Country: US</li>
          <li>State: Arizona</li>
          <li>City: Tempe</li>
          <li>Organization: {project.domain || '(domain name)'}</li>
          <li>Division: IT</li>
          <li>Common Name: {project.domain || '(domain name)'}</li>
        </ul>
      </div>

      {isValid && !success && (
        <div className="button-group" style={{ marginTop: '2rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerateCSR}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate CSR & Private Key'}
          </button>
        </div>
      )}

      {error && (
        <div className="error-box" style={{ marginTop: '1rem' }}>
          <p><strong>Error:</strong></p>
          <p>{error}</p>
          {output && <pre style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{output}</pre>}
        </div>
      )}

      {success && (
        <div className="success-box" style={{ marginTop: '1rem' }}>
          <p><strong>✓ CSR and Private Key Generated Successfully!</strong></p>
          <div className="output-box" style={{ marginTop: '1rem' }}>
            {output}
          </div>
          <div className="button-group" style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCopyCSR}
            >
              Copy CSR to Clipboard
            </button>
            <button
              className="btn btn-primary"
              onClick={goToNextStep}
            >
              Continue to Next Step →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Step1CSRGenerator;
