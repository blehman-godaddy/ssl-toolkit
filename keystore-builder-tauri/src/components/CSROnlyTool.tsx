import { useState } from 'react';

function CSROnlyTool() {
  const [domain, setDomain] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyFile, setKeyFile] = useState('');
  const [csrFile, setCsrFile] = useState('');
  const [csrContent, setCsrContent] = useState('');
  const [keyContent, setKeyContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      setOutputDir(dir);
    }
  };

  const handleGenerate = async () => {
    if (!domain || !outputDir) return;

    setIsGenerating(true);
    setError('');
    setSuccess(false);

    const keyFilePath = `${outputDir}/${domain}.key`;
    const csrFilePath = `${outputDir}/${domain}.csr`;

    try {
      // Use the secure Tauri command
      const result = await window.electronAPI.generateCSR(domain, outputDir);

      if (result.success) {
        // Verify files were created
        const keyExists = await window.electronAPI.fileExists(keyFilePath);
        const csrExists = await window.electronAPI.fileExists(csrFilePath);

        if (keyExists && csrExists) {
          setKeyFile(keyFilePath);
          setCsrFile(csrFilePath);

          // Read file contents
          const csrResult = await window.electronAPI.readFile(csrFilePath);
          const keyResult = await window.electronAPI.readFile(keyFilePath);

          if (csrResult.success && csrResult.content) {
            setCsrContent(csrResult.content);
          }

          if (keyResult.success && keyResult.content) {
            setKeyContent(keyResult.content);
          }

          setSuccess(true);
        } else {
          setError('Files were not created. Please check the output directory permissions.');
        }
      } else {
        setError(result.error || result.stderr || 'Failed to generate CSR and private key');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCSR = async () => {
    if (csrContent) {
      await window.electronAPI.writeClipboard(csrContent);
    }
  };

  const handleCopyKey = async () => {
    if (keyContent) {
      await window.electronAPI.writeClipboard(keyContent);
    }
  };

  const handleReset = () => {
    setDomain('');
    setOutputDir('');
    setKeyFile('');
    setCsrFile('');
    setCsrContent('');
    setKeyContent('');
    setError('');
    setSuccess(false);
  };

  const isValid = domain && outputDir;

  return (
    <div className="step-container">
      <h2 className="step-title">CSR & Private Key Generator</h2>
      <p className="step-description">
        Generate a Certificate Signing Request and private key without creating a keystore.
      </p>

      <div className="form-group">
        <label htmlFor="domain">Domain Name</label>
        <input
          id="domain"
          type="text"
          placeholder="www.example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
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
            value={outputDir}
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
          <li>Organization: {domain || '(domain name)'}</li>
          <li>Division: IT</li>
          <li>Common Name: {domain || '(domain name)'}</li>
        </ul>
      </div>

      {isValid && !success && (
        <div className="button-group" style={{ marginTop: '2rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
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
        </div>
      )}

      {success && (
        <>
          <div className="success-box" style={{ marginTop: '1rem' }}>
            <p><strong>✓ Generated Successfully!</strong></p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Private Key:</strong> {keyFile}
            </p>
            <p style={{ marginTop: '0.25rem' }}>
              <strong>CSR:</strong> {csrFile}
            </p>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>Private Key Content:</label>
              <button className="btn btn-secondary" onClick={handleCopyKey} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                Copy
              </button>
            </div>
            <div className="output-box" style={{ maxHeight: '150px' }}>
              {keyContent}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>CSR Content:</label>
              <button className="btn btn-secondary" onClick={handleCopyCSR} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                Copy
              </button>
            </div>
            <div className="output-box" style={{ maxHeight: '150px' }}>
              {csrContent}
            </div>
          </div>

          <div className="button-group" style={{ marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              Generate Another
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CSROnlyTool;
