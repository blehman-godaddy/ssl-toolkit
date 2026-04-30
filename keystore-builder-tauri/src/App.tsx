import { useState } from 'react';
import { Project, Step, AppMode } from './types';
import { useProjectStore } from './hooks/useProjectStore';
import Step1CSRGenerator from './components/Step1CSRGenerator';
import Step2GoDaddySubmission from './components/Step2GoDaddySubmission';
import Step3CertificateImport from './components/Step3CertificateImport';
import Step4KeystoreCreation from './components/Step4KeystoreCreation';
import CSROnlyTool from './components/CSROnlyTool';
import CleanupTool from './components/CleanupTool';
import './App.css';

const initialProject: Project = {
  domain: '',
  outputDir: '',
  keystoreFormat: 'JKS',
  keystorePassword: '',
  alias: 'tomcat',
  legacyMode: false,
  caChain: 'bundled'
};

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [mode, setMode] = useState<AppMode>('csr-only');
  const { project, updateProject, resetProject } = useProjectStore(initialProject);

  const handleNewProject = () => {
    if (confirm('Start a new project? This will clear all current data.')) {
      resetProject();
      setCurrentStep(1);
      setMode('workflow');
    }
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const isStepComplete = (step: Step): boolean => {
    switch (step) {
      case 1:
        return !!(project.keyFile && project.csrFile);
      case 2:
        return true; // Manual step, always allow progression
      case 3:
        return !!project.certFile;
      case 4:
        return false; // Final step
      default:
        return false;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>GoDaddy SSL Toolkit</h1>
          <button
            className="btn btn-secondary"
            onClick={handleNewProject}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            New Project
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${mode === 'csr-only' ? 'active' : ''}`}
          onClick={() => setMode('csr-only')}
        >
          CSR/Private Key
        </button>
        <button
          className={`tab ${mode === 'workflow' ? 'active' : ''}`}
          onClick={() => setMode('workflow')}
        >
          Full Keystore Workflow
        </button>
        <button
          className={`tab ${mode === 'cleanup' ? 'active' : ''}`}
          onClick={() => setMode('cleanup')}
        >
          Cleanup Files
        </button>
      </div>

      {mode === 'workflow' && (
        <div className="stepper">
        <div className={`step ${currentStep === 1 ? 'active' : ''} ${isStepComplete(1) ? 'complete' : ''}`}>
          <div className="step-number" onClick={() => goToStep(1)}>
            {isStepComplete(1) ? '✓' : '1'}
          </div>
          <div className="step-label">Generate CSR</div>
        </div>

        <div className="step-divider" />

        <div className={`step ${currentStep === 2 ? 'active' : ''} ${isStepComplete(2) ? 'complete' : ''}`}>
          <div className="step-number" onClick={() => isStepComplete(1) && goToStep(2)}>
            {isStepComplete(2) ? '✓' : '2'}
          </div>
          <div className="step-label">Submit to GoDaddy</div>
        </div>

        <div className="step-divider" />

        <div className={`step ${currentStep === 3 ? 'active' : ''} ${isStepComplete(3) ? 'complete' : ''}`}>
          <div className="step-number" onClick={() => isStepComplete(2) && goToStep(3)}>
            {isStepComplete(3) ? '✓' : '3'}
          </div>
          <div className="step-label">Import Certificate</div>
        </div>

        <div className="step-divider" />

        <div className={`step ${currentStep === 4 ? 'active' : ''}`}>
          <div className="step-number" onClick={() => isStepComplete(3) && goToStep(4)}>
            4
          </div>
          <div className="step-label">Create Keystore</div>
        </div>
      </div>
      )}

      {mode === 'workflow' && (
        <main className="app-main">
          {currentStep === 1 && (
            <Step1CSRGenerator
              project={project}
              updateProject={updateProject}
              goToNextStep={() => goToStep(2)}
            />
          )}

          {currentStep === 2 && (
            <Step2GoDaddySubmission
              project={project}
              goToNextStep={() => goToStep(3)}
            />
          )}

          {currentStep === 3 && (
            <Step3CertificateImport
              project={project}
              updateProject={updateProject}
              goToNextStep={() => goToStep(4)}
            />
          )}

          {currentStep === 4 && (
            <Step4KeystoreCreation
              project={project}
              updateProject={updateProject}
            />
          )}
        </main>
      )}

      {mode === 'csr-only' && (
        <main className="app-main">
          <CSROnlyTool />
        </main>
      )}

      {mode === 'cleanup' && (
        <main className="app-main">
          <CleanupTool />
        </main>
      )}
    </div>
  );
}

export default App;
