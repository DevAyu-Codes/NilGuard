import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [modal, setModal] = useState(null) // State for Popups

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:8000/login", { username, password })
      setUser(res.data)
    } catch (e) {
      setModal({ type: 'error', title: 'Access Denied', msg: 'Invalid Credentials. Try student1 / 123' })
    }
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="login-container">
        {modal && <Modal data={modal} close={() => setModal(null)} />}
        
        <div className="login-box">
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛡️</div>
          <h1 className="brand" style={{marginBottom: '10px'}}>NIL Guard</h1>
          <p style={{color: '#a1a1aa', marginBottom: '30px', fontSize: '0.9rem'}}>Secure Compliance Portal</p>
          
          <input 
            className="login-input" 
            placeholder="Username" 
            onChange={e => setUsername(e.target.value)} 
          />
          <input 
            className="login-input" 
            type="password" 
            placeholder="Password" 
            onChange={e => setPassword(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          
          <button className="btn-primary" onClick={handleLogin} style={{marginTop: '20px'}}>
            Access Dashboard
          </button>
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

  // State to hold the ID of the contract we *want* to send, while asking for permission
  const [pendingContractId, setPendingContractId] = useState(null)

  useEffect(() => { fetchContracts() }, [])

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
    } catch (e) { 
      setModal({ type: 'error', title: 'Upload Failed', msg: 'Something went wrong with the AI.' }) 
    }
    setLoading(false);
  }

  // 1. User clicks "Send to NILGO" -> Show Confirmation Modal
  const initiateSendToNilgo = (contractId) => {
    setPendingContractId(contractId)
    setModal({ type: 'confirm', title: 'Confirm Submission', msg: 'Are you sure you want to disclose this to the Compliance Office?' })
  }

  // 2. User clicks "Confirm" in Modal -> Actually Send
  const confirmSendToNilgo = async () => {
    try {
      await axios.post("http://localhost:8000/send-to-nilgo", {
        contract_id: pendingContractId,
        status: "Sent_to_Compliance"
      });
      fetchContracts();
      setModal({ type: 'success', title: 'Submitted', msg: 'Contract sent to NILGO Compliance.' })
    } catch(e) { 
      setModal({ type: 'error', title: 'Error', msg: 'Could not send status update.' }) 
    }
    setPendingContractId(null) // Reset pending ID
  }

  const handleRegister = async () => {
    try {
      const res = await axios.post("http://localhost:8000/register", newUser);
      setModal({ type: 'success', title: 'Account Created', msg: res.data.message })
      setNewUser({ name: "", username: "", password: "", role: "student" });
    } catch (e) {
      setModal({ type: 'error', title: 'Registration Failed', msg: e.response?.data?.detail || "Error" })
    }
  }

  return (
    <div className="dashboard-container">
      {/* POPUP COMPONENT */}
      {modal && (
        <Modal 
          data={modal} 
          close={() => setModal(null)} 
          onConfirm={confirmSendToNilgo} 
        />
      )}

      {/* NAVBAR */}
      <nav className="navbar">
        <div>
          <div className="brand" style={{fontSize: '1.2rem'}}>🛡️ NIL Guard</div>
          <div style={{fontSize: '0.8rem', color: '#a1a1aa'}}>Compliance Portal</div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{textAlign: 'right'}}>
            <div style={{fontWeight: 'bold'}}>{user.name}</div>
            <div style={{fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase'}}>{user.role}</div>
          </div>
          <button className="btn-logout" onClick={() => setUser(null)}>Logout</button>
        </div>
      </nav>

      {/* ADMIN VIEW */}
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
            <button className="btn-primary" style={{background: 'linear-gradient(135deg, #8b5cf6, #d946ef)'}} onClick={handleRegister}>Create Account</button>
          </div>
        </div>
      )}

      {/* STUDENT VIEW */}
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

      {/* HISTORY */}
      <h3 style={{marginBottom: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem'}}>
        {user.role === 'admin' ? "Student Submissions" : "Recent Reports"}
      </h3>

      {contracts.length === 0 && <div style={{textAlign: 'center', color: '#52525b', padding: '3rem'}}>No contracts found.</div>}

      {contracts.map((c, i) => (
        <div key={i} className="glass-card">
          <div className="result-header">
            <div>
              <div style={{fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span>📄 {c.filename}</span>
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                    style={{fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', border: '1px solid #3b82f6', padding: '2px 8px', borderRadius: '4px'}}>
                    View PDF ↗
                  </a>
                )}
              </div>
              <div style={{fontSize: '0.8rem', color: '#a1a1aa'}}>ID: {c._id}</div>
            </div>
            
            <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
              <span className="status-badge" style={{
                background: c.status === 'Sent_to_Compliance' ? '#7c3aed' : '#27272a',
                color: c.status === 'Sent_to_Compliance' ? '#fff' : '#a1a1aa'
              }}>
                {c.status.replace(/_/g, " ")}
              </span>
              
              {user.role === 'student' && c.status !== 'Sent_to_Compliance' && (
                <button className="nilgo-btn" onClick={() => initiateSendToNilgo(c._id)}>
                  🚀 Send to NILGO
                </button>
              )}
            </div>
          </div>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.analysis}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- REUSABLE MODAL COMPONENT ---
function Modal({ data, close, onConfirm }) {
  const isConfirm = data.type === 'confirm'
  
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{fontSize: '2rem', marginBottom: '10px'}}>
          {data.type === 'error' ? '❌' : data.type === 'success' ? '✅' : '⚠️'}
        </div>
        <div className="modal-title">{data.title}</div>
        <div className="modal-body">{data.msg}</div>
        
        <div className="modal-actions">
          {isConfirm ? (
            <>
              <button className="btn-modal btn-cancel" onClick={close}>Cancel</button>
              <button className="btn-modal" style={{background: 'var(--accent-secondary)', color: 'white'}} onClick={() => { onConfirm(); close(); }}>
                Confirm
              </button>
            </>
          ) : (
            <button className="btn-modal" style={{background: 'var(--accent-primary)', color: 'white'}} onClick={close}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App