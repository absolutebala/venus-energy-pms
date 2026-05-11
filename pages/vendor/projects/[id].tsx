import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { useUpload } from '@/lib/useUpload';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';

const projectData: Record<string, any> = {
  'VE-2025-001': { id:'VE-2025-001', site:'Chennai North', client:'Airtel', type:'Tower Erection', scope:'Civil foundation and structure works for Station 3 & 4. This includes pile cap construction, column erection, and structural steel work.', deadline:'30/06/2025', pm:'Arun Kumar', pmPhone:'+91 98765 43210' },
  'VE-2025-004': { id:'VE-2025-004', site:'Chennai South', client:'BSNL',   type:'Fiber Installation', scope:'Fiber laying along Station 5 to 12 route. 4.5km span including underground ducting and termination.', deadline:'15/07/2025', pm:'Vijay Kumar', pmPhone:'+91 98765 43211' },
  'VE-2025-005': { id:'VE-2025-005', site:'Coimbatore',   client:'Airtel', type:'Tower Erection', scope:'New tower erection at Coimbatore North industrial zone. 30m monopole tower with antenna mounting.', deadline:'31/08/2025', pm:'Arun Kumar', pmPhone:'+91 98765 43210' },
};

const DOC_TYPES = [
  { key:'safety_photos',    label:'Safety Photos',    desc:'Photos showing safety gear, barricading, PPE compliance', icon:'📷', accept:'image/*' },
  { key:'site_photos',      label:'Site Photos',      desc:'Current work progress photos from site',                  icon:'🏗', accept:'image/*' },
  { key:'jmr_document',     label:'JMR Document',     desc:'Joint Measurement Record signed by both parties',         icon:'📄', accept:'.pdf,.doc,.docx' },
  { key:'ac_certificate',   label:'AC Certificate',   desc:'Activity Completion Certificate',                         icon:'🏅', accept:'.pdf,.doc,.docx' },
  { key:'noc_document',     label:'NOC Document',     desc:'No Objection Certificate from relevant authorities',      icon:'📋', accept:'.pdf,.doc,.docx' },
  { key:'drawing_document', label:'Drawing Document', desc:'As-built drawings of completed work',                     icon:'📐', accept:'.pdf,.dwg,.png,.jpg' },
];

const WORK_STATUSES = ['Pending','In Progress','On Hold','Completed'];

export default function VendorProjectUpdatePage() {
  const router = useRouter();
  const { id }  = router.query;
  const project = id ? projectData[id as string] : null;
  const { upload } = useUpload();

  const [workStatus, setWorkStatus] = useState('In Progress');
  const [progress,   setProgress]   = useState('65');
  const [remarks,    setRemarks]    = useState('');

  const [docs, setDocs] = useState<Record<string,{name:string;size:string;url:string}|null>>(
    Object.fromEntries(DOC_TYPES.map(d => [d.key, null]))
  );
  const [uploading, setUploading] = useState<Record<string,boolean>>({});
  const [saving,    setSaving]    = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [toast, setToast]         = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const fileRefs = useRef<Record<string,HTMLInputElement|null>>({});

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg:'File size must be under 5MB.', type:'error' });
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const result = await upload(file, `projects/${id}/documents`);
      setDocs(prev => ({ ...prev, [key]: { name: result.fileName, size: result.fileSize, url: result.publicUrl } }));
      setToast({ msg:`${DOC_TYPES.find(d=>d.key===key)?.label} uploaded successfully!`, type:'success' });
    } catch (err: any) {
      setToast({ msg: err.message || 'Upload failed. Please try again.', type:'error' });
    }
    setUploading(prev => ({ ...prev, [key]: false }));
    if (fileRefs.current[key]) fileRefs.current[key]!.value = '';
  };

  const removeDoc = (key: string) => {
    setDocs(prev => ({ ...prev, [key]: null }));
  };

  const uploadedCount = Object.values(docs).filter(Boolean).length;
  const allUploaded   = uploadedCount === DOC_TYPES.length;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast({ msg:'Work update saved successfully!', type:'success' });
    }, 700);
  };

  const handleSubmitForReview = () => {
    if (!allUploaded) {
      setToast({ msg:`Upload all 6 documents before submitting. (${uploadedCount}/6 done)`, type:'error' });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const isCompleted = workStatus === 'Completed';
      setToast({ msg: isCompleted
        ? 'Project marked as Completed and submitted for PM review! The Returns & Logistics section is now unlocked for your Project Manager.'
        : 'Project submitted for PM review! You will be notified once reviewed.', type:'success' });
      setTimeout(() => router.push('/vendor/projects'), 2000);
    }, 800);
  };

  if (!id) return <Layout><div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading…</div></Layout>;
  if (!project) return (
    <Layout>
      <div style={{ ...card, textAlign:'center', padding:60 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:8 }}>Project Not Found</h2>
        <Link href="/vendor/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:600, textDecoration:'none' }}>← My Projects</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="fade-in">
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13 }}>
          <Link href="/vendor/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>← My Projects</Link>
          <span style={{ color:T.textDim }}>/</span>
          <span style={{ color:T.text, fontWeight:600 }}>{project.id} — Work Update</span>
        </div>

        {/* Project header */}
        <div style={{ ...card, marginBottom:16, padding:'18px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:11, color:T.textDim, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>Project</div>
              <h1 style={{ fontSize:18, fontWeight:800, color:T.text, margin:'0 0 4px' }}>{project.id} — {project.site}</h1>
              <div style={{ fontSize:13, color:T.textMuted }}>{project.client} · {project.type}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>Project Manager</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{project.pm}</div>
              <div style={{ fontSize:12, color:T.textMuted }}>{project.pmPhone}</div>
            </div>
          </div>
          <div style={{ marginTop:14, padding:12, background:T.bg, borderRadius:8, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Work Scope</div>
            <div style={{ fontSize:13, color:T.text, lineHeight:1.6 }}>{project.scope}</div>
          </div>
          <div style={{ marginTop:10, fontSize:12, color:T.textMuted }}>Deadline: <strong style={{ color:T.danger }}>{project.deadline}</strong></div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
          <div>
            {/* Work Status */}
            <div style={{ ...card, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>📊 Work Status Update</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Work Status</label>
                  <select value={workStatus} onChange={e=>setWorkStatus(e.target.value)} style={{ ...inputStyle(), width:'100%' }}>
                    {WORK_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Progress: <span style={{ color:T.primary }}>{progress}%</span></label>
                  <input type="range" min="0" max="100" value={progress} onChange={e=>setProgress(e.target.value)} style={{ width:'100%', marginTop:8 }} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Work Remarks</label>
                <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Describe work done, materials used, issues…" rows={3}
                  style={{ ...inputStyle(), width:'100%', resize:'vertical', boxSizing:'border-box' as const }} />
              </div>
            </div>

            {/* Document Upload */}
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:5 }}>📂 Required Documents</div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>All 6 documents required before submission. ({uploadedCount}/6 uploaded)</div>
              <div style={{ height:6, background:T.border, borderRadius:3, marginBottom:20 }}>
                <div style={{ height:'100%', width:`${(uploadedCount/6)*100}%`, background:allUploaded?T.success:T.primary, borderRadius:3, transition:'width 0.3s' }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {DOC_TYPES.map(doc => {
                  const uploaded  = docs[doc.key];
                  const isUploading = uploading[doc.key];

                  return (
                    <div key={doc.key} style={{ border:`1.5px solid ${uploaded?T.success:T.border}`, borderRadius:10, padding:14, background:uploaded?T.successBg:'#fff', transition:'all 0.15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:20 }}>{doc.icon}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.label}</div>
                          <div style={{ fontSize:11, color:T.textDim }}>{doc.desc}</div>
                        </div>
                      </div>

                      {uploaded ? (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.7)', padding:'6px 10px', borderRadius:6 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <a href={uploaded.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, fontWeight:600, color:T.primary, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', textDecoration:'none' }}>
                              {uploaded.name}
                            </a>
                            <div style={{ fontSize:10, color:T.textDim }}>{uploaded.size} · ✅ Uploaded</div>
                          </div>
                          <button onClick={()=>removeDoc(doc.key)} style={{ background:'none', border:'none', color:T.danger, cursor:'pointer', fontSize:16, lineHeight:1, marginLeft:8, flexShrink:0 }}>🗑</button>
                        </div>
                      ) : (
                        <>
                          <input ref={el=>{ fileRefs.current[doc.key]=el; }} type="file" accept={doc.accept} onChange={e=>handleFileUpload(doc.key,e)} style={{ display:'none' }} />
                          <button onClick={()=>fileRefs.current[doc.key]?.click()} disabled={isUploading}
                            style={{ ...btnSecondary, width:'100%', justifyContent:'center', fontSize:12, padding:'7px 0', marginTop:4, opacity:isUploading?0.7:1, cursor:isUploading?'not-allowed':'pointer' }}>
                            {isUploading ? <><div className="spinner" style={{ borderTopColor:T.primary, borderColor:`${T.primary}40`, width:12, height:12 }} /> Uploading…</> : `⬆ Upload ${doc.label}`}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ position:'sticky', top:80 }}>
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>📋 Submission Checklist</div>
              {[
                { label:'Work Status Updated',  done:workStatus!=='Pending'    },
                { label:'Progress % Set',        done:Number(progress)>0        },
                { label:'Safety Photos',         done:!!docs.safety_photos      },
                { label:'Site Photos',           done:!!docs.site_photos        },
                { label:'JMR Document',          done:!!docs.jmr_document       },
                { label:'AC Certificate',        done:!!docs.ac_certificate     },
                { label:'NOC Document',          done:!!docs.noc_document       },
                { label:'Drawing Document',      done:!!docs.drawing_document   },
              ].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<7?`1px solid ${T.border}`:'' }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:item.done?T.success:T.border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {item.done && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:12, color:item.done?T.text:T.textMuted }}>{item.label}</span>
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving} style={{ ...btnSecondary, width:'100%', justifyContent:'center', marginBottom:10, padding:'10px', opacity:saving?0.8:1 }}>
              {saving ? '…' : '💾 Save Progress'}
            </button>

            <button onClick={handleSubmitForReview} disabled={submitting || !allUploaded}
              style={{ ...btnPrimary, width:'100%', justifyContent:'center', padding:'11px', opacity:!allUploaded||submitting?0.6:1, cursor:!allUploaded?'not-allowed':'pointer' }}>
              {submitting ? <><div className="spinner" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)', width:14, height:14 }} /> Submitting…</> : workStatus === 'Completed' ? '✅ Mark Complete & Submit' : '📤 Submit for PM Review'}
            </button>

            {!allUploaded && (
              <div style={{ marginTop:10, fontSize:11, color:T.danger, textAlign:'center' }}>
                {6-uploadedCount} more document(s) required
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
}
