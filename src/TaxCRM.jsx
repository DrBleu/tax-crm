import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Upload, Clock, CheckCircle2, AlertCircle, MessageSquare, FileText, User, LogOut, Menu, X, Plus, Search } from 'lucide-react';

export default function TaxCRM() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [engagementLetters, setEngagementLetters] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', company: '', entityType: 'individual', notes: '' });
  const [newTask, setNewTask] = useState({ clientId: null, title: '', description: '', dueDate: '', assignedTo: '', priority: 'medium' });
  const [questionnaire, setQuestionnaire] = useState({});

  // Persistence
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
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('taxCRM', JSON.stringify({
        leads, clients, documents, tasks, engagementLetters, auditLog
      }));
    }
  }, [leads, clients, documents, tasks, engagementLetters, auditLog, user]);

  const logAction = useCallback((action, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: user.name,
      action,
      details,
    };
    setAuditLog(prev => [entry, ...prev.slice(0, 499)]);
  }, [user]);

  // Lead Management
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
    };
    setLeads(prev => [lead, ...prev]);
    logAction('LEAD_CREATED', { name: newLead.name });
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
    logAction('LEAD_CONVERTED', { clientName: client.name });
  };

  const questionnaires = {
    individual: [
      { id: 'income', label: 'Primary Income Source', type: 'text', required: true },
      { id: 'dependents', label: 'Number of Dependents', type: 'number', required: true },
      { id: 'homeStatus', label: 'Home Ownership Status', type: 'select', options: ['Own', 'Rent', 'Other'], required: true },
      { id: 'investments', label: 'Investment Income', type: 'textarea', required: false }
    ],
    business: [
      { id: 'businessStructure', label: 'Business Structure', type: 'select', options: ['Sole Proprietor', 'S-Corp', 'C-Corp', 'LLC', 'Partnership'], required: true },
      { id: 'businessIncome', label: 'Est. Gross Revenue 2024', type: 'number', required: true },
      { id: 'employees', label: 'Number of W-2 Employees', type: 'number', required: true },
      { id: 'accountingSystem', label: 'Accounting Software', type: 'text', required: true }
    ]
  };

  const fillQuestionnaire = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const questions = questionnaires[client.clientType] || [];
    const answers = {};
    questions.forEach(q => { answers[q.id] = ''; });
    setQuestionnaire({ clientId, answers });
  };

  const submitQuestionnaire = (clientId) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, questionnaireFilled: true } : c));
    logAction('QUESTIONNAIRE_SUBMITTED', { clientId });
    setQuestionnaire({});
  };

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
    logAction('TASK_CREATED', { title: newTask.title });
    setNewTask({ clientId: null, title: '', description: '', dueDate: '', assignedTo: '', priority: 'medium' });
  };

  const completeTask = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', completedDate: new Date().toISOString() } : t));
    logAction('TASK_COMPLETED', {});
  };

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
      scope: `Tax preparation for ${client.clientType} tax year ${client.taxYear}`,
      fee: client.clientType === 'business' ? 2500 : 1200,
    };
    setEngagementLetters(prev => [...prev, letter]);
    logAction('ENGAGEMENT_LETTER_CREATED', {});
  };

  const sendEngagementLetter = (letterId) => {
    setEngagementLetters(prev => prev.map(l => l.id === letterId ? { ...l, status: 'sent', sentDate: new Date().toISOString() } : l));
    logAction('ENGAGEMENT_LETTER_SENT', {});
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
    logAction('ENGAGEMENT_LETTER_SIGNED', {});
  };

  // LOGIN VIEW
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-light text-slate-900 mb-2">Tax CRM</h1>
            <p className="text-slate-600">Professional tax preparation platform</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="space-y-4 mb-6">
              <button 
                onClick={() => {
                  setUser({ name: 'STAFF', email: 'staff@example.com', role: 'staff' });
                  setActiveView('dashboard');
                  logAction('USER_LOGIN', { role: 'staff' });
                }}
                className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
              >
                Sign in as Staff
              </button>
              <button 
                onClick={() => {
                  setUser({ name: 'CLIENT', email: 'client@example.com', role: 'client' });
                  setActiveView('client-portal');
                  logAction('USER_LOGIN', { role: 'client' });
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Sign in as Client
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-600 text-center font-medium mb-2">Demo Credentials</p>
              <p className="text-xs text-slate-600 text-center">No password required</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STAFF DASHBOARD
  const StaffDashboard = () => {
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date());
    const missingDocs = clients.filter(c => c.docsCollected < c.docsRequired);

    return (
      <div className="space-y-8">
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Clients', value: clients.length, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900' },
            { label: 'Questionnaires Pending', value: clients.filter(c => !c.questionnaireFilled).length, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
            { label: 'Missing Documents', value: missingDocs.length, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
            { label: 'Overdue Tasks', value: overdueTasks.length, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' }
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.bg} border ${stat.border} rounded-lg p-4`}>
              <p className={`text-xs uppercase tracking-wider ${stat.text} font-semibold`}>{stat.label}</p>
              <p className={`text-3xl font-light ${stat.text} mt-2`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Overdue Tasks: {overdueTasks.length}</h3>
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

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Clients</h3>
            <div className="flex space-x-2">
              <input 
                key="client-search-input"
                type="text"
                placeholder="Search..."
                defaultValue={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All</option>
                <option value="intake">Intake</option>
                <option value="prep">Prep</option>
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

                return (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-600 mt-1">{client.email}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600">
                          <span className="flex items-center space-x-1">
                            {client.questionnaireFilled ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>Q</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            {clientDocs.length >= client.docsRequired ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{clientDocs.length}/{client.docsRequired} docs</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold px-2 py-1 rounded capitalize bg-blue-100 text-blue-800">
                          {client.workflowStage}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  // CLIENT PORTAL
  const ClientPortalView = () => {
    if (clients.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-slate-600">No active client records. Demo as staff to create clients.</p>
        </div>
      );
    }

    const client = clients[0];
    const clientDocs = documents.filter(d => d.clientId === client.id);
    const clientLetter = engagementLetters.find(l => l.clientId === client.id);

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Welcome, {client.name}</h2>
          <p className="text-slate-600">Your secure tax preparation portal</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Questionnaire', status: client.questionnaireFilled ? '✓' : 'Pending', icon: FileText },
            { label: 'Documents', status: `${client.docsCollected}/${client.docsRequired}`, icon: Upload },
            { label: 'Agreement', status: client.engagementSigned ? '✓' : 'Pending', icon: FileText },
            { label: 'Status', status: client.workflowStage, icon: Clock }
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200 flex items-center space-x-3">
              <item.icon className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{item.status}</p>
              </div>
            </div>
          ))}
        </div>

        {!client.questionnaireFilled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Complete Your Questionnaire</h3>
            <p className="text-sm text-amber-800 mb-4">Please answer the following questions to help us prepare your return.</p>
            {questionnaire.clientId === client.id ? (
              <div className="space-y-4">
                {questionnaires[client.clientType]?.map(q => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-slate-900 mb-2">{q.label}</label>
                    {q.type === 'textarea' ? (
                      <textarea key={`q-${q.id}`} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows="3" />
                    ) : q.type === 'select' ? (
                      <select key={`q-${q.id}`} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option>Select...</option>
                        {q.options?.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input key={`q-${q.id}`} type={q.type} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    )}
                  </div>
                ))}
                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => submitQuestionnaire(client.id)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                  >
                    Submit
                  </button>
                  <button 
                    onClick={() => setQuestionnaire({})}
                    className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => fillQuestionnaire(client.id)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
              >
                Start Questionnaire
              </button>
            )}
          </div>
        )}

        {clientLetter && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Engagement Letter</h3>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Service Agreement</p>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
                  {clientLetter.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{clientLetter.scope}</p>
              <p className="text-sm text-slate-600">Fee: ${clientLetter.fee.toLocaleString()}</p>
            </div>
            {clientLetter.status === 'sent' && !client.engagementSigned && (
              <button 
                onClick={() => signEngagementLetter(clientLetter.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 w-full"
              >
                Sign Agreement
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Documents</h3>
          <div className="bg-slate-50 rounded-lg p-8 border-2 border-dashed border-slate-300 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Drag and drop your documents here</p>
          </div>
        </div>
      </div>
    );
  };

  // LEAD INTAKE VIEW
  const LeadIntakeView = () => {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-light text-slate-900">Lead Intake</h2>
          <p className="text-slate-600 text-sm mt-1">Capture prospects and convert them into clients</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">New Prospect</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input 
              key="lead-name-input"
              type="text"
              placeholder="Full Name *"
              defaultValue={newLead.name}
              onBlur={(e) => setNewLead(prev => ({...prev, name: e.target.value}))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input 
              key="lead-email-input"
              type="email"
              placeholder="Email *"
              defaultValue={newLead.email}
              onBlur={(e) => setNewLead(prev => ({...prev, email: e.target.value}))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input 
              key="lead-phone-input"
              type="tel"
              placeholder="Phone"
              defaultValue={newLead.phone}
              onBlur={(e) => setNewLead(prev => ({...prev, phone: e.target.value}))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <select 
              key="lead-entity-input"
              value={newLead.entityType}
              onChange={(e) => setNewLead(prev => ({...prev, entityType: e.target.value}))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          <button 
            onClick={addLead}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
          >
            Add Lead
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Prospects ({leads.length})</h3>
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-600">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">Prospect</span>
                  </div>
                </div>
                
                {expandedLead === lead.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => convertLeadToClient(lead.id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Convert to Client
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

  const ClientDetailsPanel = ({ client, onClose }) => {
    const clientDocs = documents.filter(d => d.clientId === client.id);
    const clientLetter = engagementLetters.find(l => l.clientId === client.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-light text-slate-900">{client.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{client.email}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              {!client.questionnaireFilled && (
                <button 
                  onClick={() => { fillQuestionnaire(client.id); onClose(); }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Send Questionnaire
                </button>
              )}
              {!clientLetter && (
                <button 
                  onClick={() => { createEngagementLetter(client.id); onClose(); }}
                  className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800"
                >
                  Create Letter
                </button>
              )}
              {clientLetter && clientLetter.status === 'draft' && (
                <button 
                  onClick={() => { sendEngagementLetter(clientLetter.id); onClose(); }}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  Send Agreement
                </button>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Documents ({clientDocs.length})</h3>
              <div className="space-y-2">
                {clientDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                  </div>
                ))}
                {clientDocs.length === 0 && <p className="text-sm text-slate-600">No documents uploaded yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // MAIN LAYOUT
  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {user.role === 'staff' ? (
            <>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                  activeView === 'dashboard' ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                {sidebarOpen && <span className="text-sm font-medium">Dashboard</span>}
              </button>
              <button
                onClick={() => setActiveView('intake')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                  activeView === 'intake' ? 'bg-slate-800' : 'hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                {sidebarOpen && <span className="text-sm font-medium">Lead Intake</span>}
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('client-portal')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                activeView === 'client-portal' ? 'bg-slate-800' : 'hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              {sidebarOpen && <span className="text-sm font-medium">My Portal</span>}
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button 
            onClick={() => {
              setUser(null);
              setActiveView('login');
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
          {activeView === 'dashboard' && <StaffDashboard />}
          {activeView === 'intake' && <LeadIntakeView />}
          {activeView === 'client-portal' && <ClientPortalView />}
          {selectedClient && <ClientDetailsPanel client={selectedClient} onClose={() => setSelectedClient(null)} />}
        </div>
      </div>
    </div>
  );
}