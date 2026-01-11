import { useEffect, useState } from "react";

interface Shape {
  id: number;
  type: "hexagon" | "triangle" | "circle" | "square" | "diamond";
  x: number;
  y: number;
  size: number;
  color: "primary" | "secondary" | "accent" | "warning";
  duration: number;
  delay: number;
  opacity: number;
}

const FloatingShapes = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);

  useEffect(() => {
    const shapeTypes: Shape["type"][] = ["hexagon", "triangle", "circle", "square", "diamond"];
    const colors: Shape["color"][] = ["primary", "secondary", "accent", "warning"];
    
    const generatedShapes: Shape[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.05 + Math.random() * 0.1,
    }));
    
    setShapes(generatedShapes);
  }, []);

  const getColorClass = (color: Shape["color"]) => {
    switch (color) {
      case "primary": return "border-primary/30 bg-primary/10";
      case "secondary": return "border-secondary/30 bg-secondary/10";
      case "accent": return "border-accent/30 bg-accent/10";
      case "warning": return "border-warning/30 bg-warning/10";
    }
  };

  const renderShape = (shape: Shape) => {
    const colorClass = getColorClass(shape.color);
    const commonStyle = {
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: shape.size,
      height: shape.size,
      opacity: shape.opacity,
      animationDuration: `${shape.duration}s`,
      animationDelay: `${shape.delay}s`,
    };

    switch (shape.type) {
      case "hexagon":
        return (
          <div
            key={shape.id}
            className={`absolute border-2 ${colorClass} animate-float`}
            style={{
              ...commonStyle,
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          />
        );
      case "triangle":
        return (
          <div
            key={shape.id}
            className={`absolute border-2 ${colorClass} animate-float`}
            style={{
              ...commonStyle,
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            }}
          />
        );
      case "circle":
        return (
          <div
            key={shape.id}
            className={`absolute rounded-full border-2 ${colorClass} animate-float`}
            style={commonStyle}
          />
        );
      case "square":
        return (
          <div
            key={shape.id}
            className={`absolute border-2 ${colorClass} animate-float rotate-12`}
            style={commonStyle}
          />
        );
      case "diamond":
        return (
          <div
            key={shape.id}
            className={`absolute border-2 ${colorClass} animate-float rotate-45`}
            style={commonStyle}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grid overlay */}
      <div className="absolute inset-0 cyber-grid opacity-50" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 scan-line pointer-events-none" />
      
      {/* Floating shapes */}
      {shapes.map(renderShape)}
      
      {/* Gradient orbs */}
      <div 
        className="absolute w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-glow"
        style={{ top: "10%", left: "-10%", animationDuration: "8s" }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full bg-secondary/10 blur-3xl animate-pulse-glow"
        style={{ bottom: "10%", right: "-10%", animationDuration: "10s", animationDelay: "2s" }}
      />
      <div 
        className="absolute w-64 h-64 rounded-full bg-warning/10 blur-3xl animate-pulse-glow"
        style={{ top: "50%", right: "20%", animationDuration: "12s", animationDelay: "4s" }}
      />
      <div 
        className="absolute w-72 h-72 rounded-full bg-accent/10 blur-3xl animate-pulse-glow"
        style={{ bottom: "30%", left: "30%", animationDuration: "9s", animationDelay: "1s" }}
      />
    </div>
  );
};

export default FloatingShapes;
