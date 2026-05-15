import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from 'd3-force';
import styled, { keyframes } from "styled-components";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Network, ShieldAlert, Bug, Cpu, Activity, Eye, EyeOff } from 'lucide-react';

/* ── Animations ── */
const pulse = keyframes`0%,100%{opacity:0.6}50%{opacity:1}`;
const slideUp = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`;
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`;
const rotateSlow = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const rotateReverse = keyframes`from{transform:rotate(360deg)}to{transform:rotate(0deg)}`;

/* ── Layout ── */
const Shell = styled.div`
  display:flex; height:100vh; overflow:hidden;
  background:#060a10;
  background-image:
    radial-gradient(ellipse at 10% 40%, rgba(0,255,213,0.03), transparent 50%),
    radial-gradient(ellipse at 90% 20%, rgba(138,43,226,0.03), transparent 50%);
  font-family:'Inter',sans-serif; color:#fff;
`;


/* Star generator — spread across entire map, varied sizes */
const mkStars = (n, minSz, maxSz) => {
  const s = [];
  for(let i=0;i<n;i++){
    const sz = (minSz + Math.random()*(maxSz-minSz)).toFixed(1);
    const op = (0.2 + Math.random()*0.6).toFixed(2);
    s.push(`${Math.floor(Math.random()*3000-1500)}px ${Math.floor(Math.random()*1500-750)}px ${sz}px rgba(255,255,255,${op})`);
  }
  return s.join(',');
};
const s1=mkStars(500,0.2,0.6), s2=mkStars(200,0.5,1.0), s3=mkStars(50,0.8,1.4);

const StarField = styled.div`
  position:absolute; top:50%; left:50%; width:2px; height:2px;
  pointer-events:none; z-index:0;
`;
const SF1 = styled(StarField)`box-shadow:${s1};animation:${rotateSlow} 400s linear infinite;`;
const SF2 = styled(StarField)`box-shadow:${s2};animation:${rotateReverse} 280s linear infinite;`;
const SF3 = styled(StarField)`box-shadow:${s3};animation:${rotateSlow} 180s linear infinite;`;

const NebulaBg = styled.div`
  position:absolute; inset:0; pointer-events:none; z-index:0;
  background:
    radial-gradient(ellipse at 25% 45%, rgba(20,60,120,0.3), transparent 55%),
    radial-gradient(ellipse at 75% 30%, rgba(80,20,100,0.2), transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(10,60,50,0.2), transparent 45%);
`;

const Sidebar = styled.nav`
  width:72px; flex-shrink:0;
  background:rgba(8,12,18,0.97);
  border-right:1px solid rgba(0,255,213,0.12);
  display:flex; flex-direction:column; align-items:center;
  padding:24px 0; gap:32px; z-index:50;
`;

const Logo = styled.div`
  font-size:1.4rem; font-weight:900; color:#00ffd5;
  text-shadow:0 0 20px rgba(0,255,213,0.4);
  letter-spacing:-1px; margin-bottom:8px;
`;

const NavBtn = styled.button`
  all:unset; cursor:pointer; padding:10px; border-radius:12px;
  color:${p=>p.$active?'#00ffd5':'#3a4a60'}; transition:all .25s;
  background:${p=>p.$active?'rgba(0,255,213,0.08)':'transparent'};
  &:hover{color:#00ffd5;background:rgba(0,255,213,0.06);transform:scale(1.1)}
`;

const Main = styled.main`
  flex:1; overflow-y:auto; padding:28px 32px;
  display:flex; flex-direction:column; gap:20px;
  position:relative; z-index:1;
`;

const Header = styled.header`
  display:flex; justify-content:space-between; align-items:flex-end;
  animation:${slideUp} .5s ease-out;
`;

const TitleGroup = styled.div``;
const H1 = styled.h1`
  font-size:1.6rem; font-weight:800; margin:0;
  background:linear-gradient(135deg,#fff 30%,#00ffd5);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
`;
const Sub = styled.p`
  font-size:.82rem; color:#506880; margin:4px 0 0; font-weight:500;
`;

const StatusPill = styled.div`
  display:flex; align-items:center; gap:8px;
  background:rgba(0,255,213,0.06); border:1px solid rgba(0,255,213,0.15);
  padding:8px 16px; border-radius:40px; font-size:.78rem; color:#00ffd5; font-weight:600;
  & span{width:8px;height:8px;border-radius:50%;background:#00ffd5;animation:${pulse} 2s infinite}
`;

/* ── Grid ── */
const MetricsRow = styled.div`
  display:grid; grid-template-columns:repeat(4,1fr); gap:16px;
  animation:${slideUp} .6s ease-out;
`;

const ChartsRow = styled.div`
  display:grid; grid-template-columns:2fr 1fr 1.2fr; gap:16px;
  animation:${slideUp} .7s ease-out;
  max-height:280px;
`;

/* ── Card ── */
const Card = styled.div`
  background:linear-gradient(160deg,rgba(14,20,30,0.85),rgba(8,12,18,0.95));
  border:1px solid rgba(255,255,255,0.06);
  border-radius:16px; padding:20px; position:relative; overflow:hidden;
  backdrop-filter:blur(16px);
  box-shadow:0 4px 24px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.04);
  transition:all .3s cubic-bezier(.25,.8,.25,1);
  &::before{
    content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,255,213,0.4),transparent);
    opacity:0;transition:opacity .3s;
  }
  &:hover{border-color:rgba(0,255,213,0.2);transform:translateY(-2px);
    box-shadow:0 8px 32px rgba(0,255,213,0.08),inset 0 1px 0 rgba(255,255,255,0.04)}
  &:hover::before{opacity:1}
`;

const MetricCard = styled(Card)`
  display:flex; flex-direction:column; gap:12px; min-height:0;
`;

const CLabel = styled.div`
  font-size:.78rem; color:#506880; font-weight:600; text-transform:uppercase;
  letter-spacing:.8px; display:flex; align-items:center; gap:8px;
`;

const CValue = styled.div`
  font-size:2.2rem; font-weight:800; letter-spacing:-1px;
  color:${p=>p.$c||'#fff'};
  font-family:'JetBrains Mono','Inter',monospace;
`;

const CTag = styled.span`
  font-size:.7rem; padding:3px 8px; border-radius:6px; font-weight:600;
  background:${p=>p.$up?'rgba(0,255,100,0.1)':'rgba(255,50,50,0.1)'};
  color:${p=>p.$up?'#39ff14':'#ff4444'};
`;

const SectionTitle = styled.h3`
  font-size:.9rem; color:#7a8a9e; margin:0 0 16px; font-weight:600;
  display:flex; align-items:center; gap:8px;
`;

/* ── List ── */
const CritList = styled.div`
  display:flex; flex-direction:column; gap:8px; flex:1;
  overflow-y:auto; padding-right:6px;
  &::-webkit-scrollbar{width:3px}
  &::-webkit-scrollbar-thumb{background:rgba(0,255,213,0.15);border-radius:3px}
`;

const CritItem = styled.div`
  display:flex; justify-content:space-between; align-items:center;
  padding:10px 14px; border-radius:10px;
  background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);
  transition:all .2s;
  &:hover{background:rgba(0,255,213,0.04);border-color:rgba(0,255,213,0.2)}
`;

const RankBadge = styled.span`
  width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:.65rem;font-weight:700;flex-shrink:0;
  background:${p=>p.$i<3?'rgba(255,0,85,0.15)':'rgba(255,255,255,0.05)'};
  color:${p=>p.$i<3?'#ff0055':'#506880'};
`;

/* ── Map ── */
const MapCard = styled(Card)`
  padding:0; display:flex; flex-direction:column;
  border-color:rgba(0,255,213,0.15); animation:${slideUp} .8s ease-out;
  flex-shrink:0;
`;

const MapHeader = styled.div`
  padding:14px 20px; display:flex; justify-content:space-between; align-items:center;
  border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);
  flex-shrink:0;
`;

const MapWrap = styled.div`
  height:500px; position:relative;
  overflow:hidden;
  background:#000;
`;

const ToggleBtn = styled.button`
  all:unset; cursor:pointer; display:flex; align-items:center; gap:6px;
  font-size:.75rem; color:#506880; font-weight:500; transition:color .2s;
  &:hover{color:#00ffd5}
`;

/* ── Helpers ── */
const getColor = g => {
  const m = {
    Critical:'#ff3b3b', High:'#ff8c00', Medium:'#ffd000', Low:'#00c9a7',
    software:'#4cc9f0', Software:'#4cc9f0',
    ThreatActor:'#ff6b35', Malware:'#00d4aa',
    CVE:'#4dabf7'
  };
  return m[g]||'#6b7280';
};
const PIE_C = ['#ff6b35','#00d4aa','#4cc9f0','#4dabf7'];

const CustomTooltipStyle = {backgroundColor:'#0c1420',border:'1px solid rgba(0,255,213,0.3)',borderRadius:'10px',fontSize:'.8rem',color:'#e0e0e0'};

/* ══════════ APP ══════════ */
function App(){
  const [gd,setGd]=useState({nodes:[],links:[]});
  const [stats,setStats]=useState({actors:[],types:[],crit:[]});
  const [sel,setSel]=useState(null);
  const [hov,setHov]=useState(null);
  const [mapOpen,setMapOpen]=useState(true);
  const fg=useRef();

  useEffect(()=>{
    fetch("http://localhost:4000/graph").then(r=>r.json()).then(data=>{
      const ns=new Set(), nodes=[], links=[];
      data.forEach(d=>{
        [d.source,d.target].forEach(e=>{
          if(e&&e.id&&!ns.has(e.id)){
            let g=e.label;
            if(g==='CVE'&&e.severity) g=e.severity;
            if(!g) g='Unknown';
            nodes.push({id:e.id,group:g,neighbors:[]});
            ns.add(e.id);
          }
        });
        if(d.source&&d.target) links.push({source:d.source.id,target:d.target.id,type:d.relationship});
      });

      links.forEach(l=>{
        const a=nodes.find(n=>n.id===l.source),b=nodes.find(n=>n.id===l.target);
        if(a&&b){if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id)}
      });

      const cn=nodes.filter(n=>n.neighbors.length>0&&n.id.length<45&&!n.id.includes('<')&&!n.id.includes('>'));
      const ids=new Set(cn.map(n=>n.id));
      const vl=links.filter(l=>ids.has(l.source)&&ids.has(l.target));

      cn.forEach(n=>{
        let b=n.group==='ThreatActor'?8:n.group==='Malware'?6:4;
        n.val=Math.min(b+n.neighbors.length*1.5,25);
      });

      setGd({nodes:cn,links:vl});

      const actors=cn.filter(n=>n.group==='ThreatActor').sort((a,b)=>b.neighbors.length-a.neighbors.length).slice(0,6);
      const mc=cn.filter(n=>n.group==='Malware').length;
      const sc=cn.filter(n=>n.group==='Software'||n.group==='software').length;
      const ac=cn.filter(n=>n.group==='ThreatActor').length;
      const cc=cn.filter(n=>['CVE','Critical','High','Medium','Low'].includes(n.group)).length;

      setStats({
        actors:actors.map(a=>({name:a.id.length>12?a.id.substring(0,12)+'…':a.id,value:a.neighbors.length})),
        types:[{name:'Actors',value:ac},{name:'Malware',value:mc},{name:'Software',value:sc},{name:'CVEs',value:cc}],
        crit:cn.sort((a,b)=>b.neighbors.length-a.neighbors.length).slice(0,10)
      });
    }).catch(e=>console.error(e));
  },[]);

  useEffect(()=>{
    if(fg.current){
      fg.current.d3Force('charge').strength(-120);
      fg.current.d3Force('link').distance(40);
      fg.current.d3Force('center').strength(0.05);
      const radiusMap = {ThreatActor:80, Malware:160, Software:240, software:240, Critical:60, High:100, Medium:140, Low:180};
      fg.current.d3Force('radial', d3.forceRadial(
        node => radiusMap[node.group] || 200, 0, 0
      ).strength(0.3));
      fg.current.d3ReheatSimulation();
    }
  },[gd]);

  const nodeCanvas=useCallback((node,ctx,gs)=>{
    let hi=false,dim=false;
    if(sel){hi=node.id===sel.id||sel.neighbors.includes(node.id);dim=!hi}
    else if(hov){hi=node.id===hov.id||hov.neighbors.includes(node.id);dim=!hi}

    const s=node.val||5, c=getColor(node.group);
    if(dim){ctx.beginPath();ctx.arc(node.x,node.y,s*0.5,0,Math.PI*2);ctx.fillStyle='rgba(40,50,65,0.15)';ctx.fill();return}

    // Glow
    ctx.shadowBlur = hi ? 40 : 15;
    ctx.shadowColor = c;
    ctx.beginPath(); ctx.arc(node.x,node.y, s, 0, Math.PI*2);
    ctx.fillStyle = c;
    ctx.fill();

    // Inner core
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(node.x,node.y, s*0.35, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    // Label
    if(hi||(s>=14&&!hov&&!sel)){
      const lb=node.id.length>22?node.id.substring(0,22)+'…':node.id;
      const fs=hi?13/gs:10/gs;
      ctx.font=`600 ${fs}px Inter,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillStyle=hi?'#fff':'#8a9ab0';
      ctx.fillText(lb,node.x,node.y+s+4/gs);
    }
  },[hov,sel]);

  const linkCanvas=useCallback((link,ctx)=>{
    const si=link.source.id,ti=link.target.id;
    let hi=false,dim=false;
    if(sel){hi=sel.id===si||sel.id===ti;dim=!hi}
    else if(hov){hi=hov.id===si||hov.id===ti;dim=!hi}

    ctx.beginPath();ctx.moveTo(link.source.x,link.source.y);ctx.lineTo(link.target.x,link.target.y);
    if(dim){ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;ctx.stroke();return}
    ctx.strokeStyle=hi?'rgba(0,255,213,0.8)':'rgba(100,180,255,0.2)';
    ctx.lineWidth=hi?2.5:1;ctx.stroke();
  },[hov,sel]);

  const totalThreats=(stats.types[0]?.value||0)+(stats.types[1]?.value||0);
  const totalCVE=stats.types[3]?.value||0;
  const totalSW=stats.types[2]?.value||0;

  return(
    <Shell>

      <Sidebar>
        <Logo>TG</Logo>
        <NavBtn $active><LayoutDashboard size={20}/></NavBtn>
        <NavBtn><Network size={20}/></NavBtn>
        <NavBtn><Activity size={20}/></NavBtn>
      </Sidebar>

      <Main>
        <Header>
          <TitleGroup>
            <H1>Intelligence Command</H1>
            <Sub>Real-time Cyber Threat Landscape • Auto-updated via NLP Pipeline</Sub>
          </TitleGroup>
          <StatusPill><span/>LIVE — {gd.nodes.length} entities tracked</StatusPill>
        </Header>

        {/* ── KPI Row ── */}
        <MetricsRow>
          <MetricCard>
            <CLabel><ShieldAlert size={14} color="#ff0055"/>Active Threats</CLabel>
            <CValue $c="#ff0055">{totalThreats}</CValue>
            <CTag>Actors + Malware</CTag>
          </MetricCard>
          <MetricCard>
            <CLabel><Bug size={14} color="#00ffd5"/>Vulnerabilities</CLabel>
            <CValue $c="#00ffd5">{totalCVE}</CValue>
            <CTag>CVE Tracked</CTag>
          </MetricCard>
          <MetricCard>
            <CLabel><Cpu size={14} color="#8a2be2"/>Target Systems</CLabel>
            <CValue $c="#8a2be2">{totalSW}</CValue>
            <CTag>Software Monitored</CTag>
          </MetricCard>
          <MetricCard>
            <CLabel><Network size={14} color="#ffbf00"/>Connections</CLabel>
            <CValue $c="#ffbf00">{gd.links.length}</CValue>
            <CTag $up>Relationships</CTag>
          </MetricCard>
        </MetricsRow>

        {/* ── Charts Row ── */}
        <ChartsRow>
          <Card>
            <SectionTitle>Top Threat Actor Activity</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.actors} margin={{top:5,right:20,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="name" stroke="#3a4a60" tick={{fill:'#7a8a9e',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis stroke="#3a4a60" tick={{fill:'#7a8a9e',fontSize:11}} axisLine={false} tickLine={false}/>
                <RTooltip cursor={{fill:'rgba(0,255,213,0.03)'}} contentStyle={CustomTooltipStyle}/>
                <Bar dataKey="value" fill="url(#barGrad)" radius={[6,6,0,0]} barSize={32}>
                  <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff0055"/><stop offset="100%" stopColor="#ff006680"/>
                  </linearGradient></defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle>Entity Breakdown</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.types} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                  {stats.types.map((_,i)=><Cell key={i} fill={PIE_C[i]}/>)}
                </Pie>
                <RTooltip contentStyle={CustomTooltipStyle}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'8px'}}>
              {stats.types.map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'.72rem',color:'#7a8a9e'}}>
                  <span style={{width:8,height:8,borderRadius:3,background:PIE_C[i],flexShrink:0}}/>
                  {t.name}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Highest Connected Nodes</SectionTitle>
            <CritList>
              {stats.crit.map((n,i)=>(
                <CritItem key={i}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
                    <RankBadge $i={i}>{i+1}</RankBadge>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:'.82rem',fontWeight:600,color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'140px'}}>{n.id}</div>
                      <div style={{fontSize:'.68rem',color:'#506880',marginTop:'2px'}}>{n.group}</div>
                    </div>
                  </div>
                  <div style={{fontSize:'.8rem',fontWeight:700,color:getColor(n.group),fontFamily:'JetBrains Mono,monospace',flexShrink:0}}>{n.neighbors.length}</div>
                </CritItem>
              ))}
            </CritList>
          </Card>
        </ChartsRow>

        {/* ── Map ── */}
        <MapCard>
          <MapHeader>
            <SectionTitle style={{margin:0}}>Global Threat Network</SectionTitle>
            <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
              {sel&&<ToggleBtn onClick={()=>setSel(null)}>✕ Clear Focus</ToggleBtn>}
              <ToggleBtn onClick={()=>setMapOpen(o=>!o)}>
                {mapOpen?<EyeOff size={14}/>:<Eye size={14}/>}{mapOpen?'Collapse':'Expand'}
              </ToggleBtn>
            </div>
          </MapHeader>
          <MapWrap style={{display:mapOpen?'block':'none'}}>
            {/* Space background with rotating stars */}
            <NebulaBg/>
            <SF1/><SF2/><SF3/>
            <ForceGraph2D ref={fg} graphData={gd} nodeVal="val"
              nodeCanvasObject={nodeCanvas} linkCanvasObject={linkCanvas}
              backgroundColor="rgba(0,0,0,0)" height={500}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleSpeed={0.004}
              linkDirectionalParticleColor={l=>{
                const si=l.source.id||l.source, ti=l.target.id||l.target;
                if(sel&&(sel.id===si||sel.id===ti)) return '#00ffd5';
                return 'rgba(100,180,255,0.4)';
              }}
              onNodeClick={n=>setSel(n)} onNodeHover={n=>setHov(n)}
              onBackgroundClick={()=>setSel(null)}
              cooldownTicks={100}
            />
          </MapWrap>
        </MapCard>
      </Main>
    </Shell>
  );
}

export default App;