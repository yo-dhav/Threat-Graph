import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import styled from "styled-components";

// Styled Components
const AppContainer = styled.div`
  height: 100vh;
  background: #000511;
  background-image: radial-gradient(circle at 50% 50%, rgba(0, 255, 213, 0.05) 0%, transparent 70%);
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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

  const fgRef = useRef();

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
            nodes.push({
              id: d.source.id,
              group: d.source.label || d.source.severity || "Unknown",
              description: d.source.description || "No description",
              score: d.source.cvssScore || 0,
              neighbors: []
            });
            nodeSet.add(d.source.id);
          }

          // Process target
          if (d.target && d.target.id && !nodeSet.has(d.target.id)) {
            nodes.push({
              id: d.target.id,
              group: d.target.label || d.target.severity || "Unknown",
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

    // Glow
    ctx.shadowBlur = isHovered ? 25 : 10;
    ctx.shadowColor = color;
    
    // Radial Gradient
    const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
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
        graphData={{ nodes: filteredNodes, links: filteredLinks }}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        backgroundColor="#000511"
        onNodeClick={(node) => setSelected(node)}
        onNodeHover={(node) => setHoverNode(node)}
        d3Force="charge"
        d3ForceConfig={{
          charge: { strength: -200 }, // Spread out slightly more
          link: { distance: 100 },
        }}
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
    </AppContainer>
  );
}

export default App;