import React, { useState, useEffect, useRef } from 'react';
import { companyAPI, kbAPI } from '../api/api';

// ─── Icon SVGs (inline for zero dependency) ─────────────────────────────────
const Icons = {
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  File: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    ready:      { bg: '#d1fae5', color: '#065f46', icon: <Icons.Check />, label: 'Ready' },
    processing: { bg: '#fef3c7', color: '#92400e', icon: <Icons.Clock />, label: 'Processing...' },
    error:      { bg: '#fee2e2', color: '#991b1b', icon: <Icons.X />,    label: 'Error' },
  };
  const cfg = config[status] || config.error;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: cfg.bg, color: cfg.color,
      borderRadius: '999px', padding: '2px 10px', fontSize: '12px', fontWeight: 600
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: type === 'error' ? '#ef4444' : '#10b981',
      color: '#fff', borderRadius: '12px', padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontWeight: 500, fontSize: '14px',
      maxWidth: '360px', animation: 'slideUp 0.3s ease'
    }}>
      {message}
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    backdropFilter: 'blur(4px)'
  }}>
    <div style={{
      background: '#1e2130', borderRadius: '16px', padding: '32px',
      width: '100%', maxWidth: '520px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
          <Icons.X />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Form Styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
};
const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '6px' };
const btnPrimary = {
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px',
  cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px'
};
const btnDanger = { ...btnPrimary, background: 'linear-gradient(135deg, #ef4444, #dc2626)' };
const btnSecondary = {
  background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
};

// ─── Create Company Modal ────────────────────────────────────────────────────
const CreateCompanyModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await companyAPI.create({
        name: name.trim(),
        systemPrompt: prompt.trim() || undefined
      });
      onCreated(res.data.company);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Company" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Company Name *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Insurance Ltd" required />
        </div>
        <div>
          <label style={labelStyle}>AI System Prompt</label>
          <textarea
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="You are a helpful support agent for Acme Insurance. Be concise and accurate. If the answer is not in the provided documents, offer to escalate to a human agent."
          />
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>This defines the AI's persona for this company's customers.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={loading}>
            {loading ? 'Creating...' : <><Icons.Plus /> Create Company</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Edit Company Modal ───────────────────────────────────────────────────────
const EditCompanyModal = ({ company, onClose, onUpdated }) => {
  const [name, setName] = useState(company.name);
  const [prompt, setPrompt] = useState(company.systemPrompt || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await companyAPI.update(company._id, { name: name.trim(), systemPrompt: prompt.trim() });
      onUpdated(res.data.company);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit — ${company.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Company Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>AI System Prompt</label>
          <textarea
            style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Upload Documents Panel ───────────────────────────────────────────────────
const UploadPanel = ({ company, onClose, onUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [polling, setPolling] = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = async () => {
    try {
      const res = await kbAPI.listDocuments(company._id);
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [company._id]);

  // Poll for status updates while any doc is processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (hasProcessing && !polling) {
      setPolling(true);
      const interval = setInterval(async () => {
        await fetchDocs();
        const stillProcessing = documents.some(d => d.status === 'processing');
        if (!stillProcessing) {
          clearInterval(interval);
          setPolling(false);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await kbAPI.upload(company._id, file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      await fetchDocs();
      onUploaded && onUploaded();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!confirm(`Delete "${docName}" and all its indexed chunks?`)) return;
    try {
      await kbAPI.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d._id !== docId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await kbAPI.search(company._id, searchQuery);
      setSearchResults(res.data.results);
    } catch (err) {
      alert('Search failed. Make sure documents are indexed.');
    } finally {
      setSearching(false);
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Modal title={`Knowledge Base — ${company.name}`} onClose={onClose}>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Upload Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '12px', padding: '28px', textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: '20px',
            background: dragging ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s ease'
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {uploading ? (
            <>
              <div style={{ color: '#a5b4fc', fontWeight: 600, marginBottom: '8px' }}>Uploading... {progress}%</div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', height: '100%', width: `${progress}%`, transition: 'width 0.2s ease' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ color: '#6366f1', marginBottom: '8px' }}><Icons.Upload /></div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '4px' }}>Drop PDF here or click to browse</div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>PDF only • Max 10 MB</div>
            </>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Uploaded Documents ({documents.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map(doc => (
                <div key={doc._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#6366f1', flexShrink: 0 }}><Icons.File /></span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.originalName}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                        {fmtSize(doc.fileSize)} • {doc.totalChunks > 0 ? `${doc.totalChunks} chunks` : 'indexing...'} • {fmtDate(doc.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <StatusBadge status={doc.status} />
                    <button
                      onClick={() => handleDelete(doc._id, doc.originalName)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 8px', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Search */}
        <div>
          <h4 style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Test RAG Search
          </h4>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}><Icons.Search /></span>
              <input
                style={{ ...inputStyle, paddingLeft: '36px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter a test question..."
              />
            </div>
            <button type="submit" style={btnPrimary} disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
          </form>
          {searchResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No relevant chunks found.</p>
              ) : (
                searchResults.map((r, i) => (
                  <div key={i} style={{
                    background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '12px',
                    border: '1px solid rgba(99,102,241,0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#a5b4fc', fontSize: '12px', fontWeight: 700 }}>Chunk #{i + 1}</span>
                      {r.score && <span style={{ color: '#6366f1', fontSize: '11px' }}>Score: {r.score.toFixed(3)}</span>}
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{r.text.slice(0, 250)}{r.text.length > 250 ? '...' : ''}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Superuser Dashboard ─────────────────────────────────────────────────
const SuperuserDashboard = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [kbCompany, setKbCompany] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.list();
      setCompanies(res.data.companies || []);
    } catch (err) {
      showToast('Failed to load companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleDelete = async (company) => {
    if (!confirm(`Delete company "${company.name}" and ALL its documents and data? This cannot be undone.`)) return;
    setDeletingId(company._id);
    try {
      await companyAPI.remove(company._id);
      setCompanies(prev => prev.filter(c => c._id !== company._id));
      showToast(`"${company.name}" deleted successfully`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete company', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (company) => {
    setCompanies(prev => [company, ...prev]);
    showToast(`"${company.name}" created successfully!`);
  };

  const handleUpdated = (company) => {
    setCompanies(prev => prev.map(c => c._id === company._id ? { ...c, ...company } : c));
    showToast('Company updated successfully');
  };

  const totalDocs = companies.reduce((sum, c) => sum + (c.stats?.documents || 0), 0);
  const totalChunks = companies.reduce((sum, c) => sum + (c.stats?.chunks || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0f1117; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .company-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.4) !important; }
        .company-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #141824 100%)', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icons.Building />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#f1f5f9', letterSpacing: '-0.3px' }}>SupportCue</div>
                <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>Superuser Dashboard</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>{user?.name}</div>
                <div style={{ color: '#6366f1', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Superuser</div>
              </div>
              <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <Icons.Logout /> Logout
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total Companies', value: companies.length, accent: '#6366f1' },
              { label: 'Total Documents', value: totalDocs, accent: '#8b5cf6' },
              { label: 'Total Indexed Chunks', value: totalChunks.toLocaleString(), accent: '#a78bfa' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '24px', animation: 'fadeIn 0.4s ease'
              }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{stat.label}</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: stat.accent }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Companies Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Companies</h2>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>
              <Icons.Plus /> New Company
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading companies...</div>
          ) : companies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#6366f1', marginBottom: '12px', opacity: 0.6 }}><Icons.Building /></div>
              <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>No companies yet</div>
              <div style={{ color: '#475569', fontSize: '13px' }}>Create your first company to get started</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {companies.map((company) => (
                <div key={company._id} className="company-card" style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Icons.Building />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>{company.name}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>/{company.slug}</div>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt Preview */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>AI Prompt</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {company.systemPrompt || 'Default prompt (not set)'}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#6366f1', fontSize: '20px', fontWeight: 800 }}>{company.stats?.documents || 0}</div>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>Documents</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#8b5cf6', fontSize: '20px', fontWeight: 800 }}>{(company.stats?.chunks || 0).toLocaleString()}</div>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>Chunks</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setKbCompany(company)}
                      style={{ flex: 1, ...btnPrimary, justifyContent: 'center', padding: '8px 12px', fontSize: '13px' }}
                    >
                      <Icons.Upload /> Manage KB
                    </button>
                    <button onClick={() => setEditingCompany(company)} style={{ ...btnSecondary, padding: '8px 12px' }}>
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={() => handleDelete(company)}
                      disabled={deletingId === company._id}
                      style={{ ...btnDanger, padding: '8px 12px', opacity: deletingId === company._id ? 0.6 : 1 }}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editingCompany && (
        <EditCompanyModal company={editingCompany} onClose={() => setEditingCompany(null)} onUpdated={handleUpdated} />
      )}
      {kbCompany && (
        <UploadPanel
          company={kbCompany}
          onClose={() => setKbCompany(null)}
          onUploaded={() => fetchCompanies()}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
};

export default SuperuserDashboard;
