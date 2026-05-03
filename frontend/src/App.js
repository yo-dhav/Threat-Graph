import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import styled from "styled-components";

// Styled Components
const AppContainer = styled.div`
  height: 100vh;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  background-color: #00030a;
`;

const SpaceVoid = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #030508;
  z-index: 0;
  overflow: hidden;
`;

const Starfield = styled.div`
  position: absolute;
  width: 200vw;
  height: 200vh;
  top: -50vh;
  left: -50vw;
  background-image: 
    radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 50px 160px, #ddd, rgba(0,0,0,0)),
    radial-gradient(1.5px 1.5px at 90px 40px, #fff, rgba(0,0,0,0)),
    radial-gradient(1.5px 1.5px at 130px 80px, #fff, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: rotateStars 300s linear infinite;
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;

  @keyframes rotateStars {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const MouseGlow = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(
    600px circle at ${props => props.x}px ${props => props.y}px,
    rgba(0, 255, 213, 0.07),
    transparent 40%
  );
  z-index: 2;
  pointer-events: none;
`;

const CometContainer = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
`;

const CyberComet = styled.div`
  position: absolute;
  width: 150px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 213, 0.8), #fff);
  box-shadow: 0 0 15px rgba(0, 255, 213, 0.8);
  border-radius: 50%;
  animation: cometPath 8s linear infinite;
  opacity: 0;

  @keyframes cometPath {
    0% { transform: translate(-10vw, -10vh) rotate(45deg); opacity: 0; }
    5% { opacity: 1; }
    15% { transform: translate(110vw, 110vh) rotate(45deg); opacity: 0; }
    100% { transform: translate(110vw, 110vh) rotate(45deg); opacity: 0; }
  }

  &.comet-2 {
    animation-delay: 3s;
    background: linear-gradient(90deg, transparent, rgba(255, 0, 85, 0.8), #fff);
    box-shadow: 0 0 15px rgba(255, 0, 85, 0.8);
    top: 30%;
    left: -20%;
  }

  &.comet-3 {
    animation-delay: 5s;
    top: -20%;
    left: 40%;
  }
`;

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  background: rgba(13, 25, 48, 0.5);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TitleBox = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #ffffff;
`;

const Subtitle = styled.p`
  margin: 5px 0 0;
  color: #00ffd5;
  font-size: 0.9rem;
  font-weight: 500;
`;

const SearchInput = styled.input`
  padding: 12px 20px;
  border-radius: 30px;
  border: 1px solid rgba(0, 255, 213, 0.3);
  background: rgba(0, 5, 17, 0.6);
  color: white;
  width: 320px;
  outline: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  font-size: 0.95rem;
  
  &:focus {
    border-color: #00ffd5;
    box-shadow: 0 0 15px rgba(0, 255, 213, 0.2);
  }

  &::placeholder {
    color: #4a5b78;
  }
`;

const DetailsPanel = styled.div`
  position: absolute;
  right: 40px;
  top: 100px;
  width: 380px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(13, 25, 48, 0.7);
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  z-index: 10;
  animation: slideIn 0.3s ease-out forwards;

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 213, 0.3);
    border-radius: 10px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ff6b00;
    border-color: #ff6b00;
  }
`;

const LegendPanel = styled.div`
  position: absolute;
  left: 40px;
  bottom: 40px;
  background: rgba(13, 25, 48, 0.7);
  backdrop-filter: blur(16px);
  padding: 20px 25px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
`;

const LegendTitle = styled.h4`
  margin: 0 0 5px 0;
  color: #fff;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: #d0d0d0;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Tooltip = styled.div`
  position: absolute;
  left: 280px;
  bottom: 40px;
  width: 260px;
  background: rgba(13, 25, 48, 0.95);
  padding: 15px 20px;
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 213, 0.3);
  box-shadow: 0 5px 25px rgba(0,0,0,0.6), 0 0 15px rgba(0, 255, 213, 0.1);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 0.85rem;
  line-height: 1.6;
  z-index: 20;
  pointer-events: none;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  h5 {
    margin: 0 0 8px 0;
    color: #00ffd5;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const LegendColor = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
  box-shadow: 0 0 10px ${props => props.color};
`;

const NodeTitle = styled.h3`
  margin: 0 0 15px 0;
  font-size: 1.4rem;
  color: #fff;
  line-height: 1.3;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid ${(props) => props.color};
  color: ${(props) => props.color};
  background: ${(props) => `${props.color}15`};
  margin-right: 10px;
  margin-bottom: 20px;
`;

const DescriptionTitle = styled.h4`
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
`;

const Description = styled.p`
  color: #a0a0a0;
  line-height: 1.6;
  font-size: 0.95rem;
  margin: 0 0 20px 0;
`;

// Helper for colors
const getNodeColor = (group) => {
  switch (group) {
    case "Critical": return "#ff2a2a"; // Red
    case "High": return "#ff6b00"; // Orange
    case "Medium": return "#ffbf00"; // Amber
    case "Low": return "#39ff14"; // Green
    case "software": 
    case "Software": return "#8a2be2"; // Purple
    case "ThreatActor": return "#ff0055"; // Pink/Red
    case "Malware": return "#39ff14"; // Neon Green
    case "CVE": return "#00ffd5"; // Teal
    default: return "#ffffff"; // White
  }
};

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selected, setSelected] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [search, setSearch] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [hoverLegend, setHoverLegend] = useState(null);

  const fgRef = useRef();

  useEffect(() => {
    const handleMouseMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    fetch("http://localhost:4000/graph")
      .then((res) => res.json())
      .then((data) => {
        const nodeSet = new Set();
        const nodes = [];
        const links = [];

        data.forEach((d) => {
          // Process source
          if (d.source && d.source.id && !nodeSet.has(d.source.id)) {
            let srcGroup = d.source.label;
            if (srcGroup === "CVE" && d.source.severity) {
              srcGroup = d.source.severity; // Map to Critical, High, Medium, Low
            } else if (!srcGroup) {
              srcGroup = "Unknown";
            }
            
            nodes.push({
              id: d.source.id,
              group: srcGroup,
              description: d.source.description || "No description",
              score: d.source.cvssScore || 0,
              neighbors: []
            });
            nodeSet.add(d.source.id);
          }

          // Process target
          if (d.target && d.target.id && !nodeSet.has(d.target.id)) {
            let tgtGroup = d.target.label;
            if (tgtGroup === "CVE" && d.target.severity) {
              tgtGroup = d.target.severity; // Map to Critical, High, Medium, Low
            } else if (!tgtGroup) {
              tgtGroup = "Unknown";
            }

            nodes.push({
              id: d.target.id,
              group: tgtGroup,
              description: d.target.description || "No description",
              score: d.target.cvssScore || 0,
              neighbors: []
            });
            nodeSet.add(d.target.id);
          }

          if (d.source && d.target) {
            links.push({
              source: d.source.id,
              target: d.target.id,
              type: d.relationship
            });
          }
        });

        // Precompute neighbors
        links.forEach(link => {
          const a = nodes.find(n => n.id === link.source);
          const b = nodes.find(n => n.id === link.target);
          if (a && b) {
            a.neighbors.push(b.id);
            b.neighbors.push(a.id);
          }
        });

        setGraphData({ nodes, links });
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // Filter logic
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((n) =>
      n.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [graphData, search]);

  const filteredLinks = useMemo(() => {
    return graphData.links.filter(
      (link) =>
        filteredNodes.find((n) => n.id === (link.source.id || link.source)) &&
        filteredNodes.find((n) => n.id === (link.target.id || link.target))
    );
  }, [filteredNodes, graphData.links]);

  const finalGraphData = useMemo(() => ({
    nodes: filteredNodes,
    links: filteredLinks
  }), [filteredNodes, filteredLinks]);

  useEffect(() => {
    if (fgRef.current) {
      // Almost default repulsion. Nodes will touch but not completely overlap.
      fgRef.current.d3Force('charge').strength(-40);
      
      // Default link distance.
      fgRef.current.d3Force('link').distance(30);
      
      // Pulls disconnected clusters closer together into the middle.
      fgRef.current.d3Force('center').strength(0.08);
      
      fgRef.current.d3ReheatSimulation();
    }
  }, [finalGraphData]);

  const criticalCount = graphData.nodes.filter((n) => n.group === "Critical").length;

  // Custom Rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isNeighbor = hoverNode && hoverNode.neighbors.includes(node.id);
    const isDimmed = hoverNode && !isHovered && !isNeighbor;

    let size = 6;
    if (node.group === "ThreatActor") size = 12;
    else if (node.group === "Malware") size = 10;
    else if (node.group === "software" || node.group === "Software") size = 8;
    
    const color = getNodeColor(node.group);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    
    if (isDimmed) {
      ctx.fillStyle = "rgba(50, 50, 60, 0.3)";
      ctx.fill();
      return;
    }

    // Hardware-accelerated Glow (Shadow)
    ctx.shadowBlur = isHovered ? 40 : 15;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Reset shadow so labels aren't blurry
    ctx.shadowBlur = 0;
    
    // Label
    if (isHovered || node.group === 'software' || node.group === 'Software' || node.group === 'ThreatActor' || node.group === 'Malware') {
      const label = node.id;
      const fontSize = isHovered ? 14 / globalScale : 10 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHovered ? '#ffffff' : '#a0a0a0';
      ctx.shadowBlur = 0; // Remove shadow for crisp text
      ctx.fillText(label, node.x, node.y + size + fontSize + (2/globalScale));
    }
  }, [hoverNode]);

  const linkCanvasObject = useCallback((link, ctx) => {
    // Force graph populates source and target with node objects after tick
    const sourceId = link.source.id;
    const targetId = link.target.id;
    
    const isHovered = hoverNode && (hoverNode.id === sourceId || hoverNode.id === targetId);
    const isDimmed = hoverNode && !isHovered;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    
    if (isDimmed) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      return;
    }

    ctx.strokeStyle = isHovered ? "rgba(0, 255, 213, 0.8)" : "rgba(0, 255, 213, 0.2)";
    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.setLineDash([3, 3]); // Dashed/Dotted
    ctx.stroke();
    ctx.setLineDash([]); // Reset
  }, [hoverNode]);

  return (
    <AppContainer>
      <SpaceVoid />
      <Starfield />

      <MouseGlow x={cursorPos.x} y={cursorPos.y} />
      
      <CometContainer>
        <CyberComet />
        <CyberComet className="comet-2" />
        <CyberComet className="comet-3" />
      </CometContainer>

      <TopBar>
        <TitleBox>
          <Title>Threat Intelligence</Title>
          <Subtitle>Active Critical Nodes: {criticalCount}</Subtitle>
        </TitleBox>
        <SearchInput
          placeholder="Search Network..."
          onChange={(e) => setSearch(e.target.value)}
        />
      </TopBar>

      <ForceGraph2D
        ref={fgRef}
        graphData={finalGraphData}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        backgroundColor="rgba(0,0,0,0)"
        onNodeClick={(node) => setSelected(node)}
        onNodeHover={(node) => setHoverNode(node)}
      />

      {selected && (
        <DetailsPanel>
          <CloseButton onClick={() => setSelected(null)}>×</CloseButton>
          <NodeTitle>{selected.id}</NodeTitle>
          
          <Tag color={getNodeColor(selected.group)}>
            {selected.group === "software" ? "Software" : `Severity: ${selected.group}`}
          </Tag>
          
          {selected.score > 0 && (
            <Tag color="#00ffd5">Score: {selected.score}</Tag>
          )}

          {selected.description && selected.description !== "No description" && (
            <>
              <DescriptionTitle>Intelligence Report</DescriptionTitle>
              <Description>{selected.description}</Description>
            </>
          )}

          {selected.neighbors && selected.neighbors.length > 0 && (
            <>
              <DescriptionTitle>Connected Nodes ({selected.neighbors.length})</DescriptionTitle>
              <Description style={{ fontSize: '0.85rem' }}>
                {selected.neighbors.join(", ")}
              </Description>
            </>
          )}
        </DetailsPanel>
      )}

      <LegendPanel>
        <LegendTitle>Entity Guide</LegendTitle>
        <LegendItem onMouseEnter={() => setHoverLegend("ThreatActor")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("ThreatActor")} /> Threat Actor
        </LegendItem>
        <LegendItem onMouseEnter={() => setHoverLegend("Malware")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("Malware")} /> Malware
        </LegendItem>
        <LegendItem onMouseEnter={() => setHoverLegend("Software")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("Software")} /> Software / Product
        </LegendItem>
        
        <LegendTitle style={{ marginTop: '10px' }}>Severity (CVE)</LegendTitle>
        <LegendItem onMouseEnter={() => setHoverLegend("Severity")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("Critical")} /> Critical
        </LegendItem>
        <LegendItem onMouseEnter={() => setHoverLegend("Severity")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("High")} /> High
        </LegendItem>
        <LegendItem onMouseEnter={() => setHoverLegend("Severity")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("Medium")} /> Medium
        </LegendItem>
        <LegendItem onMouseEnter={() => setHoverLegend("Severity")} onMouseLeave={() => setHoverLegend(null)}>
          <LegendColor color={getNodeColor("Low")} /> Low
        </LegendItem>
      </LegendPanel>

      {hoverLegend === "ThreatActor" && (
        <Tooltip>
          <h5>Threat Actor</h5>
          Hacker groups, state-sponsored cyber teams, or cybercriminal syndicates responsible for coordinating attacks.
        </Tooltip>
      )}
      {hoverLegend === "Malware" && (
        <Tooltip>
          <h5>Malware</h5>
          Malicious software, ransomware, trojans, or custom tools used by Threat Actors to compromise systems.
        </Tooltip>
      )}
      {hoverLegend === "Software" && (
        <Tooltip>
          <h5>Software / Product</h5>
          Targeted applications, operating systems, or devices that are vulnerable to exploitation.
        </Tooltip>
      )}
      {hoverLegend === "Severity" && (
        <Tooltip>
          <h5>CVE Severity</h5>
          Standardized CVSS scores indicating how dangerous a vulnerability is, ranging from Low (0.0) to Critical (10.0).
        </Tooltip>
      )}
    </AppContainer>
  );
}

export default App;