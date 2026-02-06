import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [modal, setModal] = useState(null)

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:8000/login", { username, password })
      setUser(res.data)
    } catch (e) {
      setModal({ type: 'error', title: 'Access Denied', msg: 'Invalid Credentials.' })
    }
  }

  if (!user) {
    return (
      <div className="login-container">
        {modal && <Modal data={modal} close={() => setModal(null)} />}
        <div className="login-box">
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛡️</div>
          <h1 className="brand" style={{marginBottom: '10px'}}>NIL Guard</h1>
          <p style={{color: '#a1a1aa', marginBottom: '30px', fontSize: '0.9rem'}}>Secure Compliance Portal</p>
          <input className="login-input" placeholder="Username" onChange={e => setUsername(e.target.value)} />
          <input className="login-input" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button className="btn-primary" onClick={handleLogin} style={{marginTop: '20px'}}>Access Dashboard</button>
        </div>
      </div>
    )
  }

  return <Dashboard user={user} setUser={setUser} />
}

function Dashboard({ user, setUser }) {
  const [file, setFile] = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "student" })
  
  const [pendingContract, setPendingContract] = useState(null)

  useEffect(() => { 
    fetchContracts(); 
  }, [])

  const fetchContracts = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/contracts/${user.role}/${user.user_id}`)
      setContracts(res.data.reverse()) 
    } catch(e) { console.error(e) }
  }

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`http://localhost:8000/analyze?user_id=${user.user_id}`, formData);
      setFile(null); 
      fetchContracts(); 
      setModal({ type: 'success', title: 'Success!', msg: 'Contract analyzed successfully.' })
    } catch (e) { setModal({ type: 'error', title: 'Upload Failed', msg: 'AI Error.' }) }
    setLoading(false);
  }

  const handleSubmissionChoice = (choice) => {
    if (!pendingContract) return;

    if (choice === 'email') {
      const recipient = "your-nilgo-email@nilgo.com";
      const subject = `NIL Review Request: ${pendingContract.filename} - ${user.name}`;

      let cleanAnalysis = pendingContract.analysis
        .replace(/\|/g, " ") 
        .replace(/-{3,}/g, "") 
        .substring(0, 1500); 

      const body = 
`Dear Compliance Office,

I am submitting the following Name, Image, and Likeness (NIL) contract for your official review and approval.

--------------------------------------------------
📄 DOCUMENT ACCESS
--------------------------------------------------
Title: ${pendingContract.filename}
Secure Document Link: ${pendingContract.file_url}
(Please click the link above to view or download the original PDF)

--------------------------------------------------
🤖 AI RISK ASSESSMENT SUMMARY
--------------------------------------------------
The system flagged the following potential concerns based on NCAA/State rules:

${cleanAnalysis}

--------------------------------------------------
STUDENT DETAILS
--------------------------------------------------
Name: ${user.name}
Student ID: ${user.user_id}
Submission Date: ${new Date().toLocaleDateString()}

Sincerely,
${user.name}`;
      
    window.open(`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setModal(null);
  } 
  else if (choice === 'website') {
    updateContractStatus(pendingContract._id, "Sent_to_Compliance");
  }
}

  const updateContractStatus = async (id, newStatus) => {
    try {
      await axios.post("http://localhost:8000/update-status", { contract_id: id, status: newStatus });
      fetchContracts();
      
      let msg = "Status updated.";
      if (newStatus === "Sent_to_Compliance") msg = "Contract sent to Admin Dashboard.";
      if (newStatus === "Approved") msg = "Contract Approved!";
      if (newStatus === "Rejected") msg = "Contract Rejected.";
      
      setModal({ type: 'success', title: 'Success', msg: msg });
    } catch(e) { setModal({ type: 'error', title: 'Error', msg: 'Failed to update status.' }) }
    setPendingContract(null);
  }

  const handleRegister = async () => {
    try {
      await axios.post("http://localhost:8000/register", newUser);
      setModal({ type: 'success', title: 'Account Created', msg: 'User added.' })
      setNewUser({ name: "", username: "", password: "", role: "student" });
    } catch (e) { setModal({ type: 'error', title: 'Failed', msg: e.response?.data?.detail }) }
  }

  return (
    <div className="dashboard-container">
      {/* MODAL MANAGER */}
      {modal && (
        <Modal 
          data={modal} 
          close={() => setModal(null)} 
          onChoice={handleSubmissionChoice}
        />
      )}

      <nav className="navbar">
        <div><div className="brand" style={{fontSize: '1.2rem'}}>🛡️ NIL Guard</div><div style={{fontSize: '0.8rem', color: '#a1a1aa'}}>Compliance Portal</div></div>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{textAlign: 'right'}}><div style={{fontWeight: 'bold'}}>{user.name}</div><div style={{fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase'}}>{user.role}</div></div>
          <button className="btn-logout" onClick={() => setUser(null)}>Logout</button>
        </div>
      </nav>

      {/* --- ADMIN: CREATE USER --- */}
      {user.role === 'admin' && (
        <div className="glass-card">
          <h2 style={{marginBottom: '1.5rem', color: '#a78bfa'}}>👤 User Management</h2>
          <div className="admin-grid">
            <input className="login-input" style={{marginBottom:0}} placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <input className="login-input" style={{marginBottom:0}} placeholder="New User ID" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            <input className="login-input" style={{marginBottom:0}} placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            <select className="login-input" style={{marginBottom:0}} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </select>
            <button className="btn-primary" style={{gridColumn: '1 / -1', marginTop: '10px'}} onClick={handleRegister}>Create Account</button>
          </div>
        </div>
      )}

      {/* --- STUDENT: UPLOAD --- */}
      {user.role === 'student' && (
        <div className="glass-card">
          <h2 style={{marginBottom: '1rem', color: 'white'}}>📄 Analyze New Contract</h2>
          <div className="upload-area">
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} />
            <div style={{marginTop: '20px'}}>
              <button className="btn-upload" onClick={handleUpload} disabled={loading || !file}>
                {loading ? "Running AI Analysis..." : "Run Compliance Check"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY --- */}
      <h3 style={{marginBottom: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem'}}>
        {user.role === 'admin' ? "Compliance Queue" : "Recent Reports"}
      </h3>
      {contracts.length === 0 && <div style={{textAlign: 'center', color: '#52525b', padding: '3rem'}}>No contracts found.</div>}
      
      {contracts.map((c, i) => (
        <div key={i} className="glass-card" style={{
            borderColor: c.status === 'Approved' ? '#10b981' : c.status === 'Rejected' ? '#ef4444' : 'rgba(255,255,255,0.08)'
        }}>
          <div className="result-header">
            <div>
              <div style={{fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span>📄 {c.filename}</span>
                <span style={{fontSize:'0.6rem', padding:'2px 6px', borderRadius:'4px', background:'#10b981', color:'white'}}>GPT-4o</span>
                {c.file_url && <a href={c.file_url} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', border: '1px solid #3b82f6', padding: '2px 8px', borderRadius: '4px'}}>View PDF ↗</a>}
              </div>
              <div style={{fontSize: '0.8rem', color: '#a1a1aa'}}>ID: {c._id}</div>
            </div>
            
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
              {/* STATUS BADGE - LOGIC UPDATE */}
              <span className={`status-badge status-${c.status.toLowerCase()}`}>
                {c.status === 'Sent_to_Compliance' 
                  ? (user.role === 'admin' ? "⏳ Pending Review" : "✓ Sent to Compliance") 
                  : c.status.replace(/_/g, " ")}
              </span>
              
              {/* STUDENT ACTIONS */}
              {user.role === 'student' && c.status === 'AI_Reviewed' && (
                <button className="nilgo-btn" onClick={() => { setPendingContract(c); setModal({ type: 'submission_choice', title: 'Submit Contract' }) }}>
                  🚀 Send to NILGO
                </button>
              )}

              {/* ADMIN ACTIONS */}
              {user.role === 'admin' && c.status === 'Sent_to_Compliance' && (
                <div style={{display: 'flex', gap: '5px'}}>
                   <button className="btn-action btn-approve" onClick={() => updateContractStatus(c._id, "Approved")}>Approve</button>
                   <button className="btn-action btn-reject" onClick={() => updateContractStatus(c._id, "Rejected")}>Reject</button>
                </div>
              )}
            </div>
          </div>
          <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{c.analysis}</ReactMarkdown></div>
        </div>
      ))}
    </div>
  )
}

function Modal({ data, close, onChoice }) {
  if (data.type === 'submission_choice') {
    return (
      <div className="modal-overlay" onClick={close}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>🚀</div>
          <div className="modal-title">{data.title}</div>
          <div className="modal-body">How would you like to submit this contract?</div>
          <div className="modal-actions" style={{flexDirection: 'column', gap: '10px'}}>
            <button className="btn-modal" style={{background: '#3b82f6', color: 'white'}} onClick={() => onChoice('email')}>
              ✉️ Send via Email (Draft)
            </button>
            <button className="btn-modal" style={{background: '#8b5cf6', color: 'white'}} onClick={() => onChoice('website')}>
              🌐 Send on Website (Instant)
            </button>
            <button className="btn-modal btn-cancel" onClick={close} style={{marginTop:'10px'}}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // STANDARD MODALS
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{fontSize: '2rem', marginBottom: '10px'}}>{data.type === 'error' ? '❌' : '✅'}</div>
        <div className="modal-title">{data.title}</div>
        <div className="modal-body">{data.msg}</div>
        <div className="modal-actions">
           <button className="btn-modal" style={{background: 'var(--accent-primary)', color: 'white'}} onClick={close}>OK</button>
        </div>
      </div>
    </div>
  )
}

export default App