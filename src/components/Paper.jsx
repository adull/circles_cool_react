import React, { useState, useEffect, useRef } from 'react'
import { paper } from 'paper'

const Paper = ({ logging }) => {
    const loggingRef = useRef(logging);
    const parentRef = useRef(null)
    const childRef = useRef(null)
    const mousePosRef = useRef({x: 0, y: 0})

    const [display, setDisplay] = useState({ width: 0, height: 0})

    useEffect(() => {
      const element = parentRef.current
      if (!element) return;
    
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          initPaper()
          const { width, height } = entry.contentRect;
          setDisplay({ width, height })

          const canvas = document.getElementById('paper')
          if(canvas) {
            paper.view.viewSize = new paper.Size(width, height)
            paper.view.update()
          }
          setTimeout(() => { drawPattern(); attachCircleDragHandlers(); }, 100)

          paper.view.onFrame = (event) => {
            animate(event);
          };
          
        }
      });
      const handleMouseMove = (e) => {
        mousePosRef.current.x = e.clientX;
        mousePosRef.current.y = e.clientY;
      };
    
      window.addEventListener("mousemove", handleMouseMove);    
    
      observer.observe(element);

    
      return () => {
        observer.unobserve(element);
        observer.disconnect();
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }, []);

    useEffect(() => {
      loggingRef.current = logging
    }, [logging])

    const initPaper = () => {
      paper.setup("paper")
    }
    const animate = (event) => {
      paper.project.getItems({ name: /^hit-/ }).forEach(hitbox => {
        if (hitbox.data?.isUserControlled) return;
    
        const { groupRef, rowsByY, rowKeys } = hitbox.data;
        if (!groupRef || !rowKeys) return;
    
        hitbox.data.t = (hitbox.data.t ?? 0) + event.delta * 0.5;
        const phase = (Math.sin(hitbox.data.t) + 1) / 2;
    
        const n = rowKeys.length;
        for (let i = 0; i < n; i++) {
          const mi = n - 1 - i;
          const yOriginal = rowKeys[i];
          const yMirror   = rowKeys[mi];
          const yInterp   = yOriginal * (1 - phase) + yMirror * phase;
    
          rowsByY[rowKeys[i]].forEach(path => {
            const { x } = path.position;
            path.position = new paper.Point(x, yInterp);
          });
        }
    
        const MAX_ROT_DEG = 15;
        const targetDeg = Math.sin(hitbox.data.t) * MAX_ROT_DEG;
    
        groupRef.children.forEach(child => {
          if (child.name?.startsWith("vertical-segment-row-")) {
            const cur = child.data.rotDeg || 0;
            const delta = targetDeg - cur;
            if (delta) {
              child.rotate(delta, child.position);
              child.data.rotDeg = targetDeg;
            }
          }
        });
      });
    };
    
    


    
    const drawPattern = () => {
      const { view } = paper;
      const bandHeight = 8;
      const circleRadius = 60;
      const circleSpacing = 160;
      const rows = 3; // number of circle-center rows
    
      for (let y = 0; y < view.size.height; y += bandHeight) {
        const shade = (y % (bandHeight * 8)) / (bandHeight * 8);
        const strokeColor = new paper.Color(shade);
    
        let inSegment = false;
        let segStart = null;
        let segCircleId = null; // <- store which circle this vertical segment belongs to
    
        for (let x = 0; x < view.size.width; x += bandHeight) {
          // figure out if (x,y) is inside ANY circle and which one
          let insideCircleId = null;
    
          for (let row = 0; row < rows; row++) {
            const yCenter = (row + 1) * (view.size.height / (rows + 1));
            let col = 0;
            for (let cx = circleSpacing; cx < view.size.width; cx += circleSpacing * 2) {
              const dx = x - cx;
              const dy = y - yCenter;
              if (Math.sqrt(dx * dx + dy * dy) < circleRadius) {
                // unique id per circle across all rows: "<row>-<col>"
                insideCircleId = `${row}-${col}`;
                break; // we can stop at the first hit
              }
              col++;
            }
            if (insideCircleId) break;
          }
    
          if (insideCircleId) {
            if (!inSegment) {
              inSegment = true;
              segStart = x;
              segCircleId = insideCircleId;
            }
          } else {
            if (inSegment) {
              // close the vertical segment and tag row+circle
              new paper.Path.Line({
                from: [segStart, y],
                to: [x, y],
                strokeColor,
                strokeWidth: bandHeight,
                name: `vertical-segment-row-${y}`,
                data: { rowY: y, circleId: segCircleId, zIndex: 0 }
              })
              // .sendToBack();
              inSegment = false;
              segStart = null;
              segCircleId = null;
            }
    
            // horizontal fallback
            new paper.Path.Line({
              from: [x, y],
              to: [x + bandHeight, y],
              strokeColor,
              strokeWidth: bandHeight
            });
          }
        }
      }
    }
    
    
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const setCursor = (cursor) => {
      if (paper.view && paper.view.element) {
        paper.view.element.style.cursor = cursor;
      }
    };    

    const attachCircleDragHandlers = () => {
      const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
      const circles = {}; // { [circleId]: { rows: { [rowY]: Path[] } } }
    
      verticals.forEach(path => {
        const circleId = path.data?.circleId;
        const rowY = path.data?.rowY;
        if (circleId == null || rowY == null) return;
    
        if (!circles[circleId]) circles[circleId] = { rows: {} };
        if (!circles[circleId].rows[rowY]) circles[circleId].rows[rowY] = [];
        circles[circleId].rows[rowY].push(path);
      });
    
      // create a group per circle and a sibling hitbox mapped to it
      Object.entries(circles).forEach(([circleId, { rows }]) => {
        const group = new paper.Group({ name: `circle-${circleId}` });
        const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
        rowKeys.forEach(y => rows[y].forEach(p => group.addChild(p)));
    
        // compute center/radius from group's bounds
        const center = group.bounds.center.clone();
        const radius = Math.max(group.bounds.width, group.bounds.height) / 2;
    
        const hitbox = new paper.Path.Circle({
          center,
          radius,
          // needs filter color otherwise no onclick
          fillColor: new paper.Color(0, 0, 0, 0.0001),
          name: `hit-${circleId}`,
          data: {
            groupRef: group,
            rowsByY: rows,
            rowKeys: rowKeys,
            center,
            radius,
            isUserControlled: false,
            t: 0
          }
        });

    
        group.children.forEach(child => {
          if (child.name?.startsWith('vertical-segment-row-')) {
            // child.data.rotDeg = 0; // current absolute rotation we've applied
          }
        });
    
        hitbox.onMouseEnter = () => {
          setCursor("grab"); 
        };
        
        hitbox.onMouseLeave = () => {
          setCursor("default");
        };

        hitbox.onMouseDrag = (e) => {
          setCursor("grabbing");
          hitbox.data.isUserControlled = true;
        
          const g = hitbox.data.groupRef;
          const { rowsByY, rowKeys, center, radius } = hitbox.data;
        
          const rel = e.point.subtract(center);
          const vx = clamp(rel.x / radius, -1, 1);
          const vy = clamp(rel.y / radius, -1, 1);
        
          const phase = (vy + 1) / 2;
          hitbox.data.lastVy = vy;  
        
          const n = rowKeys.length;
          for (let i = 0; i < n; i++) {
            const mi = n - 1 - i;
            const yOriginal = rowKeys[i];
            const yMirror   = rowKeys[mi];
            const yInterp   = yOriginal * (1 - phase) + yMirror * phase;
        
            rowsByY[rowKeys[i]].forEach(path => {
              const { x } = path.position;
              path.position = new paper.Point(x, yInterp);
            });
          }
        
          const MAX_ROT_DEG = 15;
          const targetDeg = vx * MAX_ROT_DEG;
        
          g.children.forEach(child => {
            if (child.name?.startsWith("vertical-segment-row-")) {
              const cur = child.data.rotDeg || 0;
              const delta = targetDeg - cur;
              if (delta !== 0) {
                child.rotate(delta, child.position);
                child.data.rotDeg = targetDeg;
              }
            }
          });
        
          e.stop();
        };

        hitbox.onMouseUp = (e) => {
          hitbox.data.isUserControlled = false;

          const { rowsByY, rowKeys, center } = hitbox.data;
          if (!rowKeys || rowKeys.length < 2) return;

          const yTop = rowKeys[0];
          const yBot = rowKeys[rowKeys.length - 1];
          const samplePath = rowsByY[yTop]?.[0];
          if (!samplePath) return;

          const yCur = samplePath.position.y;
          const denom = (yBot - yTop) || 1;

          const phase = clamp((yCur - yTop) / denom, 0, 1);
          const s = 2 * phase - 1;

          const dirIncreasing = (hitbox.data.lastVy ?? 0) >= 0;
          const cAbs = Math.sqrt(Math.max(0, 1 - s * s));
          const c = dirIncreasing ? cAbs : -cAbs;

          hitbox.data.t = Math.atan2(s, c);
        
          const rel = e.point.subtract(center);
          const vx = clamp(rel.x / radius, -1, 1);
          const vy = clamp(rel.y / radius, -1, 1);

          const isVertical = vy < 0.05 || vy > 0.95
          const isNotSlanted = (vx >= 0 && vx < 0.1) || (vx <= 0 && vx > -0.1)
          if(isVertical && isNotSlanted) {
            hitbox.data.isUserControlled = true;
          }

          const mousePt = paper.view.getEventPoint(event);
          if (hitbox.contains(mousePt)) {
            setCursor("grab"); 
          } else {
            setCursor("default");
          }

        };

        
      });
    };
    
    
    return (
        <div className="w-full h-full flex flex-col" ref={parentRef}>
            <canvas 
                id="paper"
                width={display.width}
                height={display.height}
                ref={childRef}
                style={{ 
                    position: `relative`, 
                    top: 0,
                    left: 0, 
                    width: display.width,
                    height: display.height,
                }}
            >                
            </canvas>
        </div>
    )
}

export default Paper;