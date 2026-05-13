import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import { useUpload } from '@/lib/useUpload';
import { T, card, btnPrimary, btnSecondary, inputStyle } from '@/lib/theme';
import { STN_SRN_DATA, MaterialItem, STATUS_BADGE_COLOR } from '@/lib/stnSrnData';

const projectData: Record<string,any> = {
  'VE-2025-001': { id:'VE-2025-001', site:'Chennai North',  type:'Tower Erection',    scope:'Civil foundation and structure works for Station 3 & 4.', deadline:'30/06/2025', pm:'Arun Kumar',   pmPhone:'+91 98765 43210' },
  'VE-2025-002': { id:'VE-2025-002', site:'Bengaluru East', type:'Tower Maintenance', scope:'Antenna replacement and tower painting.',                  deadline:'30/04/2025', pm:'Priya Sharma', pmPhone:'+91 98765 43211' },
  'VE-2025-006': { id:'VE-2025-006', site:'Pune West',      type:'Civil Works',       scope:'RCC foundation and retaining wall construction.',          deadline:'30/04/2025', pm:'Pooja Mehta',  pmPhone:'+91 98765 43215' },
  'VE-2025-007': { id:'VE-2025-007', site:'Mumbai Central', type:'Power Works',       scope:'DG set installation and power cabling.',                   deadline:'31/05/2025', pm:'Pooja Mehta',  pmPhone:'+91 98765 43215' },
};

const DOC_TYPES = [
  { key:'safety_photos',    label:'Safety Photos',    accept:'image/*',            icon:'\u{1F4F7}' },
  { key:'site_photos',      label:'Site Photos',      accept:'image/*',            icon:'\u{1F3D7}' },
  { key:'jmr_document',    label:'JMR Document',     accept:'.pdf,.doc,.docx',    icon:'\u{1F4C4}' },
  { key:'ac_certificate',  label:'AC Certificate',   accept:'.pdf,.doc,.docx',    icon:'\u{1F3C5}' },
  { key:'noc_document',    label:'NOC Document',     accept:'.pdf,.doc,.docx',    icon:'\u{1F4CB}' },
  { key:'drawing_document',label:'Drawing Document', accept:'.pdf,.dwg,.png,.jpg',icon:'\u{1F4D0}' },
];
const WORK_STATUSES = ['Pending','In Progress','On Hold','Completed'];

export default function VendorProjectUpdatePage() {
  const router = useRouter();
  const { id }  = router.query;
  const { upload } = useUpload();
  const project = router.isReady && id ? projectData[id as string] : undefined;

  const [workStatus, setWorkStatus] = useState('In Progress');
  const [progress,   setProgress]   = useState('65');
  const [remarks,    setRemarks]    = useState('');
  const [docs, setDocs] = useState<Record<string,{name:string;size:string;url:string}|null>>(
    Object.fromEntries(DOC_TYPES.map(d => [d.key, null]))
  );
  const [uploading, setUploading]  = useState<Record<string,boolean>>({});
  const [saving,    setSaving]     = useState(false);
  const [submitting,setSubmitting] = useState(false);
  const [toast, setToast]          = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const fileRefs = useRef<Record<string,HTMLInputElement|null>>({});

  const stnData = router.isReady && id ? STN_SRN_DATA.find(s => s.projectId === id) : null;
  const [materials, setMaterials] = useState<MaterialItem[]>(stnData?.materials || []);
  const [submittingItem, setSubmittingItem] = useState<string|null>(null);

  const updateItem = (code: string, field: string, value: any) =>
    setMaterials(prev => prev.map(m => m.code === code ? { ...m, [field]: value } : m));

  const submitItem = (code: string) => {
    const item = materials.find(m => m.code === code);
    if (!item || item.utilisedQty === null) { setToast({ msg:'Enter utilised quantity first.', type:'error' }); return; }
    if (item.utilisedQty > item.stnQty) { setToast({ msg:`Cannot exceed STN qty (${item.stnQty}).`, type:'error' }); return; }
    setSubmittingItem(code);
    setTimeout(() => {
      setMaterials(prev => prev.map(m => m.code === code ? { ...m, utilisedStatus:'submitted' as const } : m));
      setToast({ msg:`${item.description} submitted for PM review!`, type:'success' });
      setSubmittingItem(null);
    }, 500);
  };

  const handleAttachment = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { setToast({ msg:'File must be under 5MB.', type:'error' }); return; }
    setUploading(p=>({...p,[key]:true}));
    try {
      const result = await upload(file, `projects/${id}/docs`);
      setDocs(p=>({...p,[key]:{ name:result.fileName, size:result.fileSize, url:result.publicUrl }}));
      setToast({ msg:'Uploaded!', type:'success' });
    } catch(err:any) { setToast({ msg:err.message||'Failed', type:'error' }); }
    setUploading(p=>({...p,[key]:false}));
  };

  const uploadedDocs    = Object.values(docs).filter(Boolean).length;
  const allDocsUploaded = uploadedDocs === DOC_TYPES.length;

  if (!router.isReady) return <Layout><div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="spinner" style={{ width:32, height:32, borderTopColor:T.primary, borderColor:`${T.primary}30` }} /></div></Layout>;
  if (!project) return (
    <Layout>
      <div style={{ ...card, textAlign:'center', padding:60, margin:20 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:12 }}>Project Not Found</h2>
        <Link href="/vendor/projects" style={{ background:T.primary, color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:13, fontWeight:600 }}>Back to My Projects</Link>
      </div>
    </Layout>
  );

  const SB = ({ status }: { status: string }) => {
    const s = STATUS_BADGE_COLOR[status as keyof typeof STATUS_BADGE_COLOR] || STATUS_BADGE_COLOR.pending;
    return <span style={{ fontSize:11, fontWeight:700, color:s.color, background:s.bg, padding:'3px 10px', borderRadius:20 }}>{s.label}</span>;
  };

  return (
    <Layout>
      <div className="fade-in">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:13 }}>
          <Link href="/vendor/projects" style={{ color:T.primary, textDecoration:'none', fontWeight:500 }}>My Projects</Link>
          <span style={{ color:T.textDim }}>/</span>
          <span style={{ color:T.text, fontWeight:600 }}>{project.id}</span>
        </div>

        <div style={{ ...card, marginBottom:16, padding:'18px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <h1 style={{ fontSize:18, fontWeight:800, color:T.text, margin:'0 0 4px' }}>{project.id} — {project.site}</h1>
              <div style={{ fontSize:13, color:T.textMuted }}>{project.type} | PM: {project.pm}</div>
            </div>
            <div style={{ textAlign:'right' as const }}>
              <div style={{ fontSize:11, color:T.textDim }}>Deadline</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.danger }}>{project.deadline}</div>
            </div>
          </div>
          <div style={{ marginTop:10, padding:'10px 14px', background:T.bg, borderRadius:8, fontSize:13, color:T.text }}>
            {project.scope}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
          <div>
            {/* Work Status */}
            <div style={{ ...card, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>Work Status Update</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px', marginBottom:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Status</label>
                  <select value={workStatus} onChange={e=>setWorkStatus(e.target.value)} style={{ ...inputStyle(), width:'100%' }}>
                    {WORK_STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Progress: {progress}%</label>
                  <input type="range" min="0" max="100" value={progress} onChange={e=>setProgress(e.target.value)} style={{ width:'100%', marginTop:8 }} />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Remarks</label>
                <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Work progress notes…" rows={2}
                  style={{ ...inputStyle(), width:'100%', resize:'vertical' as const, boxSizing:'border-box' as const }} />
              </div>
            </div>

            {/* Material Utilisation */}
            {stnData && materials.length > 0 && (
              <div style={{ ...card, marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
                  Material Utilisation (from Indus STN)
                </div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:16 }}>
                  Enter utilised qty per item and submit to PM for approval. Balance will be returned to Indus via SRN.
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:12 }}>
                  {materials.map(item => {
                    const b = STATUS_BADGE_COLOR[item.utilisedStatus];
                    const isApproved = item.utilisedStatus === 'pm_approved';
                    const isRejected = item.utilisedStatus === 'pm_rejected';
                    const canEdit    = item.utilisedStatus === 'pending' || isRejected;
                    const returnQty  = isApproved && item.pmApprovedQty !== null ? item.stnQty - item.pmApprovedQty : null;

                    return (
                      <div key={item.code} style={{ border:`1.5px solid ${isApproved?T.success:isRejected?T.danger:item.utilisedStatus==='submitted'?T.info:T.border}`, borderRadius:10, padding:14, background:isApproved?T.successBg:isRejected?'#FEF2F2':'#fff' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:T.primary }}>{item.code}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{item.description}</div>
                            <div style={{ fontSize:11, color:T.textMuted }}>Issued: {item.stnQty} {item.uom}</div>
                          </div>
                          <SB status={item.utilisedStatus} />
                        </div>

                        {isRejected && item.pmRemarks && (
                          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:T.danger }}>
                            PM Rejected: {item.pmRemarks}
                          </div>
                        )}

                        {isApproved && (
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
                            {[['Issued',`${item.stnQty} ${item.uom}`,T.text],['Approved Used',`${item.pmApprovedQty} ${item.uom}`,T.success],['To Return',`${returnQty} ${item.uom}`,returnQty&&returnQty>0?T.danger:T.success]].map(([l,v,c]:any,i)=>(
                              <div key={i} style={{ background:'rgba(255,255,255,0.7)', borderRadius:7, padding:'8px 10px' }}>
                                <div style={{ fontSize:10, color:T.textDim }}>{l}</div>
                                <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.utilisedStatus === 'submitted' && (
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8, marginBottom:8 }}>
                            <div style={{ background:T.infoBg, borderRadius:7, padding:'8px 10px' }}>
                              <div style={{ fontSize:10, color:T.textDim }}>Your Input</div>
                              <div style={{ fontSize:13, fontWeight:700, color:T.info }}>{item.utilisedQty} {item.uom}</div>
                            </div>
                            <div style={{ background:T.bg, borderRadius:7, padding:'8px 10px' }}>
                              <div style={{ fontSize:10, color:T.textDim }}>Remarks</div>
                              <div style={{ fontSize:12, color:T.text }}>{item.utilisedRemarks||'—'}</div>
                            </div>
                          </div>
                        )}

                        {canEdit && (
                          <>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'0 12px', marginBottom:10 }}>
                              <div>
                                <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.text, marginBottom:4 }}>Utilised Qty ({item.uom}) *</label>
                                <input type="number" min="0" max={item.stnQty} value={item.utilisedQty??''}
                                  onChange={e=>updateItem(item.code,'utilisedQty',e.target.value===''?null:Number(e.target.value))}
                                  placeholder={`Max ${item.stnQty}`}
                                  style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                              </div>
                              <div>
                                <label style={{ display:'block', fontSize:12, fontWeight:600, color:T.text, marginBottom:4 }}>Remarks</label>
                                <input value={item.utilisedRemarks} onChange={e=>updateItem(item.code,'utilisedRemarks',e.target.value)}
                                  placeholder="How/where material was used…"
                                  style={{ ...inputStyle(), width:'100%', boxSizing:'border-box' as const }} />
                              </div>
                            </div>
                            <button onClick={()=>submitItem(item.code)} disabled={submittingItem===item.code||item.utilisedQty===null}
                              style={{ ...btnPrimary, fontSize:12, padding:'7px 16px', opacity:item.utilisedQty===null?0.5:1 }}>
                              {submittingItem===item.code?'Submitting…':isRejected?'Resubmit to PM':'Submit to PM'}
                            </button>
                          </>
                        )}
                        {item.utilisedStatus==='submitted' && <div style={{ fontSize:12, color:T.info }}>Awaiting PM review…</div>}
                        {isApproved && item.pmRemarks && <div style={{ fontSize:12, color:T.success }}>PM: {item.pmRemarks}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents */}
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:12 }}>Required Documents ({uploadedDocs}/6)</div>
              <div style={{ height:6, background:T.border, borderRadius:3, marginBottom:16 }}>
                <div style={{ height:'100%', width:`${(uploadedDocs/6)*100}%`, background:allDocsUploaded?T.success:T.primary, borderRadius:3 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {DOC_TYPES.map(doc => {
                  const uploaded = docs[doc.key]; const isUp = uploading[doc.key];
                  return (
                    <div key={doc.key} style={{ border:`1.5px solid ${uploaded?T.success:T.border}`, borderRadius:10, padding:14, background:uploaded?T.successBg:'#fff' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:18 }}>{doc.icon}</span>
                        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.label}</div>
                      </div>
                      {uploaded ? (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.7)', padding:'6px 10px', borderRadius:6 }}>
                          <div style={{ fontSize:12, color:T.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{uploaded.name}</div>
                          <button onClick={()=>setDocs(p=>({...p,[doc.key]:null}))} style={{ background:'none', border:'none', color:T.danger, cursor:'pointer', fontSize:14 }}>X</button>
                        </div>
                      ) : (
                        <>
                          <input ref={el=>{fileRefs.current[doc.key]=el;}} type="file" accept={doc.accept} onChange={e=>handleAttachment(doc.key,e)} style={{ display:'none' }} />
                          <button onClick={()=>fileRefs.current[doc.key]?.click()} disabled={isUp}
                            style={{ ...btnSecondary, width:'100%', justifyContent:'center' as const, fontSize:12, padding:'6px 0' }}>
                            {isUp?'Uploading…':'Upload'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position:'sticky' as const, top:80 }}>
            {stnData && materials.length > 0 && (
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Material Status</div>
                {materials.map((m,i)=>{
                  const b = STATUS_BADGE_COLOR[m.utilisedStatus];
                  return (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:i<materials.length-1?`1px solid ${T.border}`:'' }}>
                      <div style={{ fontSize:11, color:T.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, marginRight:6 }}>{m.description}</div>
                      <span style={{ fontSize:10, fontWeight:700, color:b.color, background:b.bg, padding:'2px 7px', borderRadius:10, flexShrink:0 }}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Checklist</div>
              {[['Status Set',workStatus!=='Pending'],['Progress Set',Number(progress)>0],['Safety Photos',!!docs.safety_photos],['Site Photos',!!docs.site_photos],['JMR',!!docs.jmr_document],['AC Cert',!!docs.ac_certificate],['NOC',!!docs.noc_document],['Drawing',!!docs.drawing_document]].map(([l,d]:any,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:i<7?`1px solid ${T.border}`:'' }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:d?T.success:T.border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {d && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>v</span>}
                  </div>
                  <span style={{ fontSize:12, color:d?T.text:T.textMuted }}>{l}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>{setSaving(true);setTimeout(()=>setSaving(false),600);}} disabled={saving}
              style={{ ...btnSecondary, width:'100%', justifyContent:'center' as const, marginBottom:10, padding:'10px' }}>
              {saving?'Saved!':'Save Progress'}
            </button>
            <button onClick={()=>{if(!allDocsUploaded){setToast({msg:`Upload all 6 docs (${uploadedDocs}/6 done)`,type:'error'});return;}setSubmitting(true);setTimeout(()=>{setToast({msg:'Submitted for PM review!',type:'success'});router.push('/vendor/projects');},800);}}
              disabled={submitting||!allDocsUploaded}
              style={{ ...btnPrimary, width:'100%', justifyContent:'center' as const, padding:'11px', opacity:!allDocsUploaded||submitting?0.6:1 }}>
              {submitting?'Submitting…':workStatus==='Completed'?'Mark Complete & Submit':'Submit for PM Review'}
            </button>
            {!allDocsUploaded && <div style={{ marginTop:8, fontSize:11, color:T.danger, textAlign:'center' as const }}>{6-uploadedDocs} doc(s) required</div>}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </Layout>
  );
}
