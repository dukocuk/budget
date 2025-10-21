/**
 * Template Manager Component
 * Manages budget templates - view, create, and delete reusable budget configurations
 */

import { useState, useEffect } from 'react';
import { useBudgetPeriods } from '../hooks/useBudgetPeriods';
import { useAuth } from '../hooks/useAuth';
import { localDB } from '../lib/pglite';
import './TemplateManager.css';

export default function TemplateManager({ activePeriod, onTemplateCreated }) {
  const { user } = useAuth();
  const { getTemplates, saveAsTemplate, deleteTemplate } = useBudgetPeriods(
    user?.id
  );

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expensesPreview, setExpensesPreview] = useState([]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const loadedTemplates = await getTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    setLoading(false);
  };

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load expense preview for a template
  const loadExpensePreview = async templateId => {
    try {
      const result = await localDB.query(
        'SELECT name, amount, frequency FROM expenses WHERE budget_period_id = $1 ORDER BY name',
        [templateId]
      );
      setExpensesPreview(result.rows);
    } catch (error) {
      console.error('Error loading expense preview:', error);
      setExpensesPreview([]);
    }
  };

  const handleCreateTemplate = async e => {
    e.preventDefault();

    if (!activePeriod) {
      alert('Ingen aktiv budget periode at gemme');
      return;
    }

    if (!templateName.trim()) {
      alert('Indtast venligst et skabelonnavn');
      return;
    }

    try {
      await saveAsTemplate(activePeriod.id, templateName, templateDescription);
      setTemplateName('');
      setTemplateDescription('');
      setShowCreateForm(false);
      await loadTemplates();

      if (onTemplateCreated) {
        onTemplateCreated();
      }
    } catch (error) {
      alert(`Fejl ved oprettelse af skabelon: ${error.message}`);
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (
      !confirm(
        `Er du sikker på at du vil slette skabelonen "${templateName}"? Dette kan ikke fortrydes.`
      )
    ) {
      return;
    }

    try {
      await deleteTemplate(templateId);
      await loadTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setExpensesPreview([]);
      }
    } catch (error) {
      alert(`Fejl ved sletning af skabelon: ${error.message}`);
    }
  };

  const handleTemplateClick = async template => {
    setSelectedTemplate(template);
    await loadExpensePreview(template.id);
  };

  if (loading) {
    return (
      <div className="template-manager-loading">
        <div className="spinner"></div>
        <p>Indlæser skabeloner...</p>
      </div>
    );
  }

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <h2>📋 Budget Skabeloner</h2>
        <p className="template-manager-description">
          Gem dit nuværende budget som en genbrugelig skabelon for hurtigere
          oprettelse af fremtidige år.
        </p>
      </div>

      {/* Create Template Form */}
      {!showCreateForm && activePeriod && (
        <button
          className="btn btn-primary create-template-btn"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Gem aktuelle budget som skabelon
        </button>
      )}

      {showCreateForm && (
        <form className="create-template-form" onSubmit={handleCreateTemplate}>
          <h3>Opret ny skabelon fra {activePeriod?.year}</h3>

          <div className="form-group">
            <label htmlFor="templateName">
              Skabelonnavn <span className="required">*</span>
            </label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="F.eks. Standard Familie Budget"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateDescription">Beskrivelse (valgfrit)</label>
            <textarea
              id="templateDescription"
              value={templateDescription}
              onChange={e => setTemplateDescription(e.target.value)}
              placeholder="Beskrivelse af hvad denne skabelon bruges til..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success">
              💾 Gem skabelon
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Annuller
            </button>
          </div>
        </form>
      )}

      {/* Template List */}
      {templates.length === 0 ? (
        <div className="no-templates">
          <p>📭 Du har ingen gemte skabeloner endnu.</p>
          <p className="hint">
            Opret en skabelon fra dit aktuelle budget for at genbruge det
            senere.
          </p>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateClick(template)}
            >
              <div className="template-card-header">
                <h3>{template.templateName}</h3>
                <button
                  className="btn-delete-template"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteTemplate(template.id, template.templateName);
                  }}
                  title="Slet skabelon"
                  aria-label={`Slet ${template.templateName}`}
                >
                  🗑️
                </button>
              </div>

              {template.templateDescription && (
                <p className="template-description">
                  {template.templateDescription}
                </p>
              )}

              <div className="template-meta">
                <span className="template-payment">
                  💰 {template.monthlyPayment?.toLocaleString('da-DK')}{' '}
                  kr./måned
                </span>
                <span className="template-date">
                  Oprettet:{' '}
                  {new Date(template.createdAt).toLocaleDateString('da-DK')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Preview Panel */}
      {selectedTemplate && (
        <div className="expense-preview-panel">
          <h3>Udgifter i "{selectedTemplate.templateName}"</h3>
          {expensesPreview.length === 0 ? (
            <p className="no-expenses">Ingen udgifter i denne skabelon</p>
          ) : (
            <div className="expense-preview-list">
              {expensesPreview.map((expense, index) => (
                <div key={index} className="expense-preview-item">
                  <span className="expense-name">{expense.name}</span>
                  <span className="expense-details">
                    {expense.amount.toLocaleString('da-DK')} kr. (
                    {expense.frequency})
                  </span>
                </div>
              ))}
              <div className="expense-preview-total">
                <strong>Total: {expensesPreview.length} udgifter</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
