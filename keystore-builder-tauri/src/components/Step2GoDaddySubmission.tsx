import { Project } from '../types';

interface Props {
  project: Project;
  goToNextStep: () => void;
}

function Step2GoDaddySubmission({ project, goToNextStep }: Props) {
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

  return (
    <div className="step-container">
      <h2 className="step-title">Step 2: Submit to GoDaddy</h2>
      <p className="step-description">
        Submit your CSR to GoDaddy to get your SSL certificate issued.
      </p>

      <div className="info-box">
        <p><strong>Instructions:</strong></p>
        <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Copy your CSR (Certificate Signing Request) below</li>
          <li>Log in to your GoDaddy account</li>
          <li>Navigate to your SSL certificate product</li>
          <li>Submit the CSR for certificate issuance</li>
          <li>Wait for GoDaddy to issue the certificate (usually a few minutes to hours)</li>
          <li>Download the certificate when ready</li>
        </ol>
      </div>

      <div className="form-group">
        <label>CSR File Location</label>
        <div className="command-box" style={{ background: '#f5f5f5', color: '#333' }}>
          {project.csrFile}
        </div>
      </div>

      <div className="button-group">
        <button className="btn btn-secondary" onClick={handleCopyCSR}>
          Copy CSR to Clipboard
        </button>
      </div>

      <div className="info-box" style={{ marginTop: '2rem' }}>
        <p>
          <strong>Note:</strong> GoDaddy will send you an email when your certificate is ready.
          Download the certificate file (it will have a serial number like abc123def.crt).
        </p>
      </div>

      <div className="button-group" style={{ marginTop: '2rem' }}>
        <button className="btn btn-primary" onClick={goToNextStep}>
          I Have My Certificate →
        </button>
      </div>
    </div>
  );
}

export default Step2GoDaddySubmission;
