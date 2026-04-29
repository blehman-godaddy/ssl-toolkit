import { useState } from 'react';
import { Project } from '../types';

interface Props {
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
}

function Step4KeystoreCreation({ project, updateProject }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [keystoreFile, setKeystoreFile] = useState<string>('');

  const handleCreateKeystore = async () => {
    if (!project.keystorePassword) {
      setError('Please enter a keystore password');
      return;
    }

    if (!project.keyFile || !project.certFile) {
      setError('Missing key or certificate file');
      return;
    }

    setIsCreating(true);
    setOutput('');
    setError('');

    const keystoreExt = project.keystoreFormat.toLowerCase();

    try {
      // Use the secure Tauri command - password sent via stdin, no shell injection
      const result = await window.electronAPI.createKeystore(
        project.domain,
        project.outputDir,
        project.keyFile,
        project.certFile,
        project.keystoreFormat,
        keystoreExt,
        project.keystorePassword,
        project.alias,
        project.legacyMode
      );

      if (result.success) {
        const keystorePath = `${project.outputDir}/${project.domain}.${keystoreExt}`;
        setKeystoreFile(keystorePath);
        setOutput(result.stdout || 'Keystore created successfully');
      } else {
        setError(result.error || 'Failed to create keystore');
        setOutput(result.stderr || '');
      }

      setIsCreating(false);
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  const isValid = project.keystorePassword && project.alias;

  return (
    <div className="step-container">
      <h2 className="step-title">Step 4: Create Keystore</h2>
      <p className="step-description">
        Configure and create your keystore file for use with your application server.
      </p>

      <div className="form-group">
        <label>Keystore Format</label>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="radio"
              name="format"
              value="JKS"
              checked={project.keystoreFormat === 'JKS'}
              onChange={() => updateProject({ keystoreFormat: 'JKS' })}
              style={{ flexShrink: 0 }}
            />
            <span>JKS (Java KeyStore)</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="radio"
              name="format"
              value="P12"
              checked={project.keystoreFormat === 'P12'}
              onChange={() => updateProject({ keystoreFormat: 'P12' })}
              style={{ flexShrink: 0 }}
            />
            <span>P12 (PKCS12)</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="radio"
              name="format"
              value="PFX"
              checked={project.keystoreFormat === 'PFX'}
              onChange={() => updateProject({ keystoreFormat: 'PFX' })}
              style={{ flexShrink: 0 }}
            />
            <span>PFX (PKCS12, for IIS/Windows)</span>
          </label>
        </div>
      </div>

      {project.keystoreFormat === 'JKS' && (
        <div className="info-box">
          <p style={{ fontSize: '0.875rem' }}>
            <strong>JKS requires Java</strong> (the <code>keytool</code> command) on this machine.
            Modern Java servers (Java 9+, Tomcat 9+) read P12 natively — pick <strong>P12</strong>
            to skip the Java dependency unless your target server specifically needs JKS.
          </p>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="alias">Alias Name</label>
        <input
          id="alias"
          type="text"
          value={project.alias}
          onChange={(e) => updateProject({ alias: e.target.value })}
          placeholder="tomcat"
        />
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
          Default: "tomcat" - used to identify the certificate in the keystore
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="password">Keystore Password</label>
        <input
          id="password"
          type="password"
          value={project.keystorePassword}
          onChange={(e) => updateProject({ keystorePassword: e.target.value })}
          placeholder="Enter a secure password"
        />
      </div>

      <div className="checkbox-group">
        <input
          id="legacy"
          type="checkbox"
          checked={project.legacyMode}
          onChange={(e) => updateProject({ legacyMode: e.target.checked })}
        />
        <label htmlFor="legacy">
          Legacy compatibility mode (for older Java versions)
        </label>
      </div>

      {project.legacyMode && (
        <div className="info-box">
          <p style={{ fontSize: '0.875rem' }}>
            Adds: -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1
          </p>
        </div>
      )}

      <div className="button-group" style={{ marginTop: '2rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleCreateKeystore}
          disabled={!isValid || isCreating}
        >
          {isCreating ? 'Creating Keystore...' : 'Create Keystore'}
        </button>
      </div>

      {error && (
        <div className="error-box" style={{ marginTop: '1rem' }}>
          <p><strong>Error:</strong></p>
          <p>{error}</p>
        </div>
      )}

      {output && (
        <>
          <div className="success-box" style={{ marginTop: '1rem' }}>
            <p><strong>✓ Keystore created successfully!</strong></p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {keystoreFile}
            </p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Command Output:
            </label>
            <div className="output-box">{output}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default Step4KeystoreCreation;
