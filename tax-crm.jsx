import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Upload, Clock, CheckCircle2, AlertCircle, MessageSquare, FileText, User, LogOut, Settings, Menu, X, Eye, EyeOff, Trash2, Edit2, Save, Plus, Search, Filter, Download } from 'lucide-react';

const TaxCRM = () => {
  // ==================== STATE MANAGEMENT ====================
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data storage
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [engagementLetters, setEngagementLetters] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // UI state
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);

  // ==================== PERSISTENCE ====================
  useEffect(() => {
    const savedData = localStorage.getItem('taxCRM');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setLeads(data.leads || []);
        setClients(data.clients || []);
        setDocuments(data.documents || []);
        setTasks(data.tasks || []);
        setEngagementLetters(data.engagementLetters || []);
        setAuditLog(data.auditLog || []);
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('taxCRM', JSON.stringify({
        leads, clients, documents, tasks, engagementLetters, auditLog
      }));
    }
  }, [leads, clients, documents, tasks, engagementLetters, auditLog, user]);

  // ==================== AUDIT TRAIL ====================
  const logAction = useCallback((action, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: user.name,
      action,
      details,
      ipAddress: 'localhost' // In production, capture real IP
    };
    setAuditLog(prev => [entry, ...prev.slice(0, 499)]);
  }, [user]);

  // ==================== LEAD MANAGEMENT ====================
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', company: '', entityType: 'individual', notes: '' });

  const addLead = () => {
    if (!newLead.name || !newLead.email) return;
    const lead = {
      id: Date.now(),
      ...newLead,
      status: 'prospect',
      createdDate: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      assignedTo: user.name,
      questionnaireSent: false,
      documentsRequested: false
    };
    setLeads(prev => [lead, ...prev]);
    logAction('LEAD_CREATED', { leadId: lead.id, name: newLead.name });
    setNewLead({ name: '', email: '', phone: '', company: '', entityType: 'individual', notes: '' });
  };

  const convertLeadToClient = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const client = {
      id: Date.now(),
      leadId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      entityType: lead.entityType,
      status: 'onboarding',
      clientType: lead.entityType === 'business' ? 'business' : 'individual',
      createdDate: new Date().toISOString(),
      assignedTo: lead.assignedTo,
      questionnaireFilled: false,
      engagementSigned: false,
      docsCollected: 0,
      docsRequired: lead.entityType === 'business' ? 8 : 5,
      workflowStage: 'intake',
      notes: lead.notes,
      portalPassword: Math.random().toString(36).substr(2, 12),
      taxYear: new Date().getFullYear()
    };
    
    setClients(prev => [client, ...prev]);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    logAction('LEAD_CONVERTED', { clientId: client.id, clientName: client.name });
  };

  // ==================== CLIENT QUESTIONNAIRE ====================
  const [questionnaire, setQuestionnaire] = useState({});

  const questionnaires = {
    individual: [
      { id: 'income', label: 'Primary Income Source', type: 'text', required: true },
      { id: 'dependents', label: 'Number of Dependents', type: 'number', required: true },
      { id: 'dependentDetails', label: 'Dependent Details (Names, Ages, SSN)', type: 'textarea', required: true },
      { id: 'homeStatus', label: 'Home Ownership Status', type: 'select', options: ['Own', 'Rent', 'Other'], required: true },
      { id: 'investments', label: 'Investment Income (Stocks, Bonds, Crypto)', type: 'textarea', required: false }
    ],
    business: [
      { id: 'businessStructure', label: 'Business Structure', type: 'select', options: ['Sole Proprietor', 'S-Corp', 'C-Corp', 'LLC', 'Partnership'], required: true },
      { id: 'businessIncome', label: '2024 Estimated Gross Revenue', type: 'number', required: true },
      { id: 'employees', label: 'Number of W-2 Employees', type: 'number', required: true },
      { id: 'businessExpenses', label: 'Major Business Expenses (1099 contractors, rent, utilities, etc.)', type: 'textarea', required: true },
      { id: 'bookkeeperName', label: 'Bookkeeper/Accountant Name (if applicable)', type: 'text', required: false },
      { id: 'accountingSystem', label: 'Accounting Software Used', type: 'text', required: true },
      { id: 'previousReturns', label: 'Years of Previous Tax Returns Available', type: 'text', required: true },
      { id: 'stateFiling', label: 'States Where Business Operates', type: 'textarea', required: true }
    ]
  };

  const fillQuestionnaire = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const questions = questionnaires[client.clientType] || [];
    const answers = {};
    
    questions.forEach(q => {
      answers[q.id] = '';
    });
    
    setQuestionnaire({ clientId, answers });
  };

  const submitQuestionnaire = (clientId) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, questionnaireFilled: true } : c));
    logAction('QUESTIONNAIRE_SUBMITTED', { clientId, type: clients.find(cl => cl.id === clientId).clientType });
    setQuestionnaire({});
  };

  // ==================== DOCUMENT MANAGEMENT ====================
  const [documentUpload, setDocumentUpload] = useState({ clientId: null, docType: '', file: null });

  const requiredDocTypes = {
    individual: [
      { id: 'w2', label: 'W-2 Forms', count: 1 },
      { id: '1099nec', label: '1099-NEC (Self-Employment)', count: 1 },
      { id: '1099int', label: '1099-INT (Interest)', count: 1 },
      { id: '1099div', label: '1099-DIV (Dividends)', count: 1 },
      { id: 'stmts', label: 'Bank/Investment Statements', count: 1 }
    ],
    business: [
      { id: 'w2', label: 'W-2 Forms (All Employees)', count: 'all' },
      { id: '1099', label: '1099 Forms (Contractors)', count: 'all' },
      { id: 'gl', label: 'General Ledger / Trial Balance', count: 1 },
      { id: 'bp', label: 'Bank Statements & Reconciliation', count: 12 },
      { id: 'expense', label: 'Expense Documentation', count: 1 },
      { id: 'payroll', label: 'Payroll Reports (940, 941)', count: 4 },
      { id: 'sales', label: 'Sales/Revenue Documentation', count: 1 },
      { id: 'cap', label: 'Capital Asset Transactions', count: 1 }
    ]
  };

  const uploadDocument = (clientId, docType, fileName) => {
    const doc = {
      id: Date.now(),
      clientId,
      docType,
      fileName,
      uploadDate: new Date().toISOString(),
      uploadedBy: user.name,
      status: 'received',
      checkedBy: null,
      notes: ''
    };
    setDocuments(prev => [...prev, doc]);
    
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, docsCollected: c.docsCollected + 1 } : c));
    logAction('DOCUMENT_UPLOADED', { clientId, docType, fileName });
    setDocumentUpload({ clientId: null, docType: '', file: null });
  };

  // ==================== ENGAGEMENT LETTER ====================
  const createEngagementLetter = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const letter = {
      id: Date.now(),
      clientId,
      clientName: client.name,
      created: new Date().toISOString(),
      status: 'draft',
      sentDate: null,
      signedDate: null,
      signedBy: null,
      scope: `Tax preparation services for ${client.clientType === 'business' ? 'business' : 'individual'} tax year ${client.taxYear}`,
      fee: client.clientType === 'business' ? 2500 : 1200,
      deadline: new Date(new Date().getFullYear(), 3, 15).toISOString()
    };
    setEngagementLetters(prev => [...prev, letter]);
    logAction('ENGAGEMENT_LETTER_CREATED', { clientId, letterId: letter.id });
  };

  const sendEngagementLetter = (letterId) => {
    const letter = engagementLetters.find(l => l.id === letterId);
    setEngagementLetters(prev => prev.map(l => l.id === letterId ? { ...l, status: 'sent', sentDate: new Date().toISOString() } : l));
    logAction('ENGAGEMENT_LETTER_SENT', { letterId, clientId: letter.clientId });
  };

  const signEngagementLetter = (letterId) => {
    const letter = engagementLetters.find(l => l.id === letterId);
    setEngagementLetters(prev => prev.map(l => l.id === letterId ? { 
      ...l, 
      status: 'signed', 
      signedDate: new Date().toISOString(),
      signedBy: user.name
    } : l));
    
    setClients(prev => prev.map(c => c.id === letter.clientId ? { ...c, engagementSigned: true, workflowStage: 'prep' } : c));
    logAction('ENGAGEMENT_LETTER_SIGNED', { letterId, clientId: letter.clientId });
  };

  // ==================== TASK & WORKFLOW MANAGEMENT ====================
  const [newTask, setNewTask] = useState({ clientId: null, title: '', description: '', dueDate: '', assignedTo: '', priority: 'medium' });

  const addTask = () => {
    if (!newTask.clientId || !newTask.title || !newTask.dueDate) return;
    
    const task = {
      id: Date.now(),
      clientId: newTask.clientId,
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      assignedTo: newTask.assignedTo || user.name,
      priority: newTask.priority,
      status: 'open',
      createdDate: new Date().toISOString(),
      completedDate: null
    };
    setTasks(prev => [...prev, task]);
    logAction('TASK_CREATED', { clientId: newTask.clientId, taskId: task.id, title: newTask.title });
    setNewTask({ clientId: null, title: '', description: '', dueDate: '', assignedTo: '', priority: 'medium' });
  };

  const completeTask = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', completedDate: new Date().toISOString() } : t));
    logAction('TASK_COMPLETED', { taskId });
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < now);
  };

  // ==================== CLIENT PORTAL ====================
  const ClientPortalView = ({ client, isClientUser }) => {
    const clientDocs = documents.filter(d => d.clientId === client.id);
    const clientTasks = tasks.filter(t => t.clientId === client.id && t.status !== 'completed');
    const clientLetter = engagementLetters.find(l => l.clientId === client.id);

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Welcome, {client.name}</h2>
          <p className="text-slate-600">Your secure tax preparation portal</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Questionnaire', status: client.questionnaireFilled ? 'complete' : 'pending', icon: FileText },
            { label: 'Documents', status: client.docsCollected >= client.docsRequired ? 'complete' : 'pending', icon: Upload, meta: `${client.docsCollected}/${client.docsRequired}` },
            { label: 'Agreement', status: client.engagementSigned ? 'complete' : 'pending', icon: FileText },
            { label: 'Status', status: client.workflowStage, icon: Clock }
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200 flex items-center space-x-3">
              <item.icon className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{item.meta || item.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Questionnaire Section */}
        {!client.questionnaireFilled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Complete Your Questionnaire</h3>
            <p className="text-sm text-amber-800 mb-4">Please answer the following questions to help us prepare your return.</p>
            {questionnaire.clientId === client.id ? (
              <QuestionnaireForm 
                client={client} 
                questions={questionnaires[client.clientType]}
                onSubmit={() => submitQuestionnaire(client.id)}
              />
            ) : (
              <button 
                onClick={() => fillQuestionnaire(client.id)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
              >
                Start Questionnaire
              </button>
            )}
          </div>
        )}

        {/* Document Upload */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Documents</h3>
          <div className="bg-slate-50 rounded-lg p-8 border-2 border-dashed border-slate-300 text-center cursor-pointer hover:bg-slate-100 transition">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Drag and drop your documents here or click to browse</p>
            <p className="text-xs text-slate-500 mt-1">Supported: PDF, JPG, PNG (Max 25MB)</p>
          </div>
          
          {/* Documents Checklist */}
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Required Documents</h4>
            {requiredDocTypes[client.clientType]?.map(doc => {
              const uploaded = clientDocs.filter(d => d.docType === doc.id).length;
              return (
                <div key={doc.id} className="flex items-center space-x-3 text-sm">
                  {uploaded > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="text-slate-700 flex-1">{doc.label}</span>
                  <span className="text-xs text-slate-500">{uploaded} uploaded</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engagement Letter */}
        {clientLetter && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Engagement Letter</h3>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-900">Service Agreement</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  clientLetter.status === 'signed' ? 'bg-green-100 text-green-800' :
                  clientLetter.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-200 text-slate-800'
                }`}>
                  {clientLetter.status.charAt(0).toUpperCase() + clientLetter.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{clientLetter.scope}</p>
              <p className="text-sm text-slate-600">Fee: ${clientLetter.fee.toLocaleString()}</p>
            </div>
            {clientLetter.status === 'sent' && !client.engagementSigned && isClientUser && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition w-full">
                Sign Agreement
              </button>
            )}
          </div>
        )}

        {/* Action Items */}
        {clientTasks.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Action Items</h3>
            <div className="space-y-2">
              {clientTasks.map(task => (
                <div key={task.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== QUESTIONNAIRE FORM ====================
  const QuestionnaireForm = ({ client, questions, onSubmit }) => {
    const answers = questionnaire.answers || {};

    return (
      <div className="space-y-4">
        {questions.map(q => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              {q.label} {q.required && <span className="text-red-600">*</span>}
            </label>
            {q.type === 'textarea' && (
              <textarea 
                value={answers[q.id] || ''}
                onChange={(e) => setQuestionnaire(prev => ({
                  ...prev,
                  answers: { ...prev.answers, [q.id]: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                rows="3"
              />
            )}
            {q.type === 'select' && (
              <select 
                value={answers[q.id] || ''}
                onChange={(e) => setQuestionnaire(prev => ({
                  ...prev,
                  answers: { ...prev.answers, [q.id]: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select...</option>
                {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
            {['text', 'number'].includes(q.type) && (
              <input 
                type={q.type}
                value={answers[q.id] || ''}
                onChange={(e) => setQuestionnaire(prev => ({
                  ...prev,
                  answers: { ...prev.answers, [q.id]: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            )}
          </div>
        ))}
        <div className="flex space-x-3 pt-4">
          <button 
            onClick={onSubmit}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Submit Questionnaire
          </button>
          <button 
            onClick={() => setQuestionnaire({})}
            className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ==================== STAFF DASHBOARD ====================
  const StaffDashboard = () => {
    const overdueTasks = getOverdueTasks();
    const missingDocs = clients.filter(c => c.docsCollected < c.docsRequired);
    const pendingEngagements = engagementLetters.filter(l => l.status !== 'signed');

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light text-slate-900">Tax Season Dashboard</h2>
            <p className="text-slate-600 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-medium text-slate-900">{clients.length} Clients</p>
            <p>{clients.filter(c => c.workflowStage === 'prep').length} in Prep</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Clients', value: clients.length, color: 'slate' },
            { label: 'Pending Questionnaires', value: clients.filter(c => !c.questionnaireFilled).length, color: 'amber' },
            { label: 'Missing Documents', value: missingDocs.length, color: 'orange' },
            { label: 'Overdue Tasks', value: overdueTasks.length, color: 'red' }
          ].map((stat, idx) => (
            <div key={idx} className={`bg-${stat.color}-50 border border-${stat.color}-200 rounded-lg p-4`}>
              <p className={`text-xs uppercase tracking-wider text-${stat.color}-900 font-semibold`}>{stat.label}</p>
              <p className={`text-3xl font-light text-${stat.color}-900 mt-2`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Overdue Tasks</h3>
                <p className="text-sm text-red-800 mt-2">{overdueTasks.length} tasks past deadline</p>
                <div className="mt-3 space-y-1">
                  {overdueTasks.slice(0, 3).map(task => {
                    const client = clients.find(c => c.id === task.clientId);
                    return (
                      <p key={task.id} className="text-sm text-red-800">
                        <span className="font-medium">{client?.name}</span> - {task.title}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client List & Management */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Clients</h3>
            <div className="flex space-x-2">
              <input 
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All Stages</option>
                <option value="intake">Intake</option>
                <option value="prep">Prep</option>
                <option value="review">Review</option>
                <option value="delivery">Ready</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {clients
              .filter(c => filterStatus === 'all' || c.workflowStage === filterStatus)
              .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(client => {
                const clientDocs = documents.filter(d => d.clientId === client.id);
                const clientTasks = tasks.filter(t => t.clientId === client.id && t.status !== 'completed');
                const clientLetter = engagementLetters.find(l => l.clientId === client.id);

                return (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-600 mt-1">{client.email} • {client.entityType}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600">
                          <span className="flex items-center space-x-1">
                            {client.questionnaireFilled ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>Questionnaire</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            {clientDocs.length >= client.docsRequired ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{clientDocs.length}/{client.docsRequired} docs</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            {client.engagementSigned ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>Agreement</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${
                          client.workflowStage === 'intake' ? 'bg-blue-100 text-blue-800' :
                          client.workflowStage === 'prep' ? 'bg-amber-100 text-amber-800' :
                          client.workflowStage === 'review' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {client.workflowStage}
                        </span>
                        <p className="text-xs text-slate-600 mt-2">{clientTasks.length} active tasks</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Client Details Panel */}
        {selectedClient && (
          <ClientDetailsPanel 
            client={selectedClient} 
            onClose={() => setSelectedClient(null)}
            onConvert={() => {}}
          />
        )}
      </div>
    );
  };

  // ==================== CLIENT DETAILS PANEL ====================
  const ClientDetailsPanel = ({ client, onClose }) => {
    const clientDocs = documents.filter(d => d.clientId === client.id);
    const clientTasks = tasks.filter(t => t.clientId === client.id);
    const clientLetter = engagementLetters.find(l => l.clientId === client.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-light text-slate-900">{client.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{client.email} • {client.phone}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {!client.questionnaireFilled && (
                <button 
                  onClick={() => fillQuestionnaire(client.id)}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  Send Questionnaire
                </button>
              )}
              {!clientLetter && (
                <button 
                  onClick={() => createEngagementLetter(client.id)}
                  className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
                >
                  Create Engagement Letter
                </button>
              )}
              {clientLetter && clientLetter.status === 'draft' && (
                <button 
                  onClick={() => sendEngagementLetter(clientLetter.id)}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                >
                  Send Agreement
                </button>
              )}
              <button 
                onClick={() => fillQuestionnaire(client.id)}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
              >
                Add Task
              </button>
            </div>

            {/* Documents */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Documents ({clientDocs.length})</h3>
              <div className="space-y-2">
                {clientDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                      <p className="text-xs text-slate-600">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Received</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Tasks ({clientTasks.filter(t => t.status !== 'completed').length})</h3>
              <div className="space-y-2">
                {clientTasks.filter(t => t.status !== 'completed').map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-600">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => completeTask(task.id)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      Complete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== LEAD INTAKE VIEW ====================
  const LeadIntakeView = () => {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-light text-slate-900">Lead Intake</h2>
          <p className="text-slate-600 text-sm mt-1">Capture prospects and convert them into clients</p>
        </div>

        {/* New Lead Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">New Prospect</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Full Name *</label>
              <input 
                type="text"
                value={newLead.name}
                onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Email *</label>
              <input 
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Phone</label>
              <input 
                type="tel"
                value={newLead.phone}
                onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Company</label>
              <input 
                type="text"
                value={newLead.company}
                onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900 mb-2">Entity Type</label>
              <select 
                value={newLead.entityType}
                onChange={(e) => setNewLead({...newLead, entityType: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900 mb-2">Notes</label>
              <textarea 
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                rows="3"
              />
            </div>
          </div>
          <button 
            onClick={addLead}
            className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Add Lead
          </button>
        </div>

        {/* Leads List */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Prospects ({leads.length})</h3>
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-600">{lead.email} • {lead.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">Prospect</span>
                    <p className="text-xs text-slate-600 mt-1 capitalize">{lead.entityType}</p>
                  </div>
                </div>
                
                {expandedLead === lead.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Company</p>
                      <p className="text-sm text-slate-900">{lead.company || 'Not specified'}</p>
                    </div>
                    {lead.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Notes</p>
                        <p className="text-sm text-slate-900">{lead.notes}</p>
                      </div>
                    )}
                    <div className="flex space-x-2 pt-2">
                      <button 
                        onClick={() => convertLeadToClient(lead.id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        Convert to Client
                      </button>
                      <button className="px-3 py-2 bg-slate-200 text-slate-900 text-sm rounded-lg hover:bg-slate-300 transition">
                        Send Questionnaire
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==================== LOGIN VIEW ====================
  const LoginView = () => {
    const [loginData, setLoginData] = useState({ email: '', password: '', role: 'staff' });

    const handleLogin = () => {
      if (!loginData.email) return;
      setUser({
        name: loginData.email.split('@')[0].toUpperCase(),
        email: loginData.email,
        role: loginData.role
      });
      setActiveView(loginData.role === 'client' ? 'client-portal' : 'dashboard');
      logAction('USER_LOGIN', { email: loginData.email, role: loginData.role });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-light text-slate-900 mb-2">Tax CRM</h1>
            <p className="text-slate-600">Professional tax preparation platform</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                <input 
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Role</label>
                <div className="flex space-x-3">
                  {['staff', 'client'].map(role => (
                    <label key={role} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio"
                        checked={loginData.role === role}
                        onChange={() => setLoginData({...loginData, role})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700 capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleLogin}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition mt-6"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-600 text-center">Demo Credentials</p>
              <p className="text-xs text-slate-600 text-center mt-2">
                <span className="font-medium">Staff:</span> staff@example.com<br/>
                <span className="font-medium">Client:</span> client@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-sm">TaxCRM</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Items */}
        {user.role === 'staff' && (
          <nav className="flex-1 px-3 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Clock },
              { id: 'intake', label: 'Lead Intake', icon: User },
              { id: 'clients', label: 'Clients', icon: FileText },
              { id: 'documents', label: 'Documents', icon: Upload },
              { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
              { id: 'audit', label: 'Audit Log', icon: MessageSquare }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id === 'dashboard' ? 'dashboard' : item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                  activeView === item.id ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        )}

        {user.role === 'client' && (
          <nav className="flex-1 px-3 space-y-2">
            {[
              { id: 'client-portal', label: 'My Portal', icon: FileText },
              { id: 'documents', label: 'Documents', icon: Upload }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                  activeView === item.id ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        )}

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-800">
          <button 
            onClick={() => {
              setUser(null);
              setActiveView('login');
              logAction('USER_LOGOUT', { user: user.email });
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Dashboard */}
          {activeView === 'dashboard' && user.role === 'staff' && <StaffDashboard />}

          {/* Lead Intake */}
          {activeView === 'intake' && <LeadIntakeView />}

          {/* Client Portal */}
          {activeView === 'client-portal' && user.role === 'client' && clients.length > 0 && (
            <ClientPortalView client={clients[0]} isClientUser={true} />
          )}

          {/* Documents View */}
          {activeView === 'documents' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-light text-slate-900">Documents</h2>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                {documents.filter(d => !selectedClient || d.clientId === selectedClient.id).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-b-0">
                    <div>
                      <p className="font-medium text-slate-900">{doc.fileName}</p>
                      <p className="text-sm text-slate-600">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{doc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log */}
          {activeView === 'audit' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-light text-slate-900">Audit Trail</h2>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="space-y-3">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="flex items-start justify-between p-4 border-b border-slate-200 last:border-b-0">
                      <div>
                        <p className="font-medium text-slate-900">{entry.action}</p>
                        <p className="text-sm text-slate-600 mt-1">{entry.user}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded">{entry.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxCRM;
