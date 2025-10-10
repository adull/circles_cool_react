import React, { useState, useEffect, useRef } from 'react'
import { easeOutBack, lerp, clamp, syncTimeToPhase } from '../helpers';
import { paper } from 'paper'

const Paper = ({ logging }) => {
    const loggingRef = useRef(logging);
    const parentRef = useRef(null)
    const childRef = useRef(null)
    const mousePosRef = useRef({x: 0, y: 0})
    const WAVESPEED = 0.5

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
        if (hitbox.data.isDragging) return;
        hitbox.data.t = (hitbox.data.t ?? 0) + event.delta * WAVESPEED;
    
        if (hitbox.data.syncToLastPhase && hitbox.data.lastPhaseY != null) {
          hitbox.data.syncToLastPhase = false;
        }
    
        const targetPhaseY = (Math.sin(hitbox.data.t) + 1) / 2;
        const targetRotX   = Math.cos(hitbox.data.t) * 0.1;
    
        const k = 10; // smoothing strength; higher = snappier
        const alpha = 1 - Math.exp(-k * event.delta);
        const prevPhaseY = hitbox.data.lastPhaseY ?? targetPhaseY;
        const prevRotX   = hitbox.data.lastRotX   ?? targetRotX;
    
        const phaseY = prevPhaseY + (targetPhaseY - prevPhaseY) * alpha;
        const rotX   = prevRotX   + (targetRotX   - prevRotX)   * alpha;
    
        applyPhaseToCircle(hitbox, phaseY, rotX);
    
        hitbox.data.lastPhaseY = phaseY;
        hitbox.data.lastRotX   = rotX;
      });
    };
    
    const applyPhaseToCircle = (hitbox, phase, rotX = 0) => {
      const { rowsByY, rowKeys, groupRef } = hitbox.data;
      if (!rowsByY || !rowKeys || !groupRef) return;
    
      const n = rowKeys.length;
    
      // deform rows
      for (let i = 0; i < n; i++) {
        const mi = n - 1 - i;
        const yOriginal = rowKeys[i];
        const yMirror = rowKeys[mi];
        const yInterp = yOriginal * (1 - phase) + yMirror * phase;
    
        rowsByY[yOriginal].forEach(path => {
          const { x } = path.position;
          path.position = new paper.Point(x, yInterp);
        });
      }
    
      // rotate
      const MAX_ROT_DEG = 180;
      const targetDeg = rotX * MAX_ROT_DEG;
      groupRef.children.forEach(child => {
        if (child.name?.startsWith("vertical-segment-row-")) {
          const cur = child.data.rotDeg || 0;
          const delta = targetDeg - cur;
          if (delta !== 0) {
            child.rotate(delta, child.position);
            child.data.rotDeg = targetDeg;
          }
        }
      });
    }
    
    const drawPattern = () => {
      const { view } = paper;
      const { width, height } = view.size
      const isMobile = window.innerWidth < 769
      
      const rows = isMobile ? 2 : 3;
      const cols = isMobile ? 3 : 4
      
      const bandHeight = 8;
      const circleRadius = bandHeight * 10;
      const numShades = 8;

      const heightRemainder = height % (bandHeight * numShades)
      const newHeight = height - heightRemainder
      const xSpacing = (height - circleRadius * rows) / rows
      const ySpacing = (newHeight - circleRadius * cols) / cols

      // draw initial lines
      for (let y = 0; y < newHeight; y += bandHeight) {
        const shade = (y % (bandHeight * numShades)) / (bandHeight * numShades);
        const strokeColor = new paper.Color(shade);
        new paper.Path.Line({
          from: [0, y],
          to: [width, y],
          strokeColor,
          strokeWidth: bandHeight,
          name: `vertical-segment-row-${y}`,
          data: { rowY: y, zIndex: 0 }
        })
      }

      const totalGridWidth = cols * ( 2 * circleRadius) + (cols - 1) * xSpacing
      const totalGridHeight = rows * ( 2 * circleRadius) + (rows - 1) * ySpacing
      const offsetX = (width - totalGridWidth) / 2
      const offsetY = (newHeight - totalGridHeight) / 2

      // draw the initial circles that we'll "cut" out of the initial lines
      for(let colIndex = 0; colIndex < cols; colIndex++) {
        for(let rowIndex = 0; rowIndex < rows; rowIndex++) {
          // segCircleId++
          const segCircleId = `${rowIndex}-${colIndex}`
          const x = offsetX + colIndex  * (2 * circleRadius + xSpacing) + circleRadius
          const y = offsetY + rowIndex * (2 * circleRadius + ySpacing) + circleRadius
          const center = new paper.Point(x, y)
          
          for (let yOffset = -circleRadius; yOffset <= circleRadius; yOffset += bandHeight) {
            
            const absoluteY = center.y + yOffset;
            const shade = (absoluteY % (bandHeight * numShades)) / (bandHeight * numShades);
            const fillColor = new paper.Color(shade);

      
            // Find the half-width at this height (circle equation)
            const halfWidth = Math.sqrt(Math.max(0, circleRadius ** 2 - yOffset ** 2));
      
            // Draw a horizontal rectangle (bar)
            new paper.Path.Rectangle({
              from: [center.x - halfWidth, absoluteY - bandHeight / 2],
              to: [center.x + halfWidth, absoluteY + bandHeight / 2],
              name: `vertical-segment-row-${absoluteY.toFixed(0)}`,
              data: {
                rowY: absoluteY,
                circleId: segCircleId,
                zIndex: 0
              },

              fillColor
            });
          }
        }
      }
    }

    const setCursor = (cursor) => {
      if (paper.view && paper.view.element) {
        paper.view.element.style.cursor = cursor;
      }
    };    

    const attachCircleDragHandlers = () => {
      const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
      const circles = {};
    
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
            t: 0,
            phaseOffset: 0,
            isDragging: false
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
          hitbox.data.isDragging = true;
          const { center, radius, dragOffset } = hitbox.data;

          const rel = e.point.subtract(center);
          const vx = clamp(rel.x / radius, -1, 1);
          const vy = clamp(rel.y / radius, -1, 1);

          const phaseY = clamp((vy + 1) / 2 + (dragOffset?.phaseY || 0), 0, 1);
          const rotX = clamp(vx + (dragOffset?.rotX || 0), -1, 1);


          hitbox.data.lastPhaseY = phaseY;
          hitbox.data.lastRotX   = rotX;
          applyPhaseToCircle(hitbox, phaseY, rotX);
        };
        
        hitbox.onMouseUp = () => {
          setCursor("grab");
          const { lastPhaseY, lastRotX } = hitbox.data;
          syncTimeToPhase(hitbox, lastPhaseY);
        
          hitbox.data.isDragging = false;
        
          hitbox.data.releaseEase = {
            t: 0,
            startPhase: lastPhaseY,
            startRot: lastRotX,
          };
        };
        
        
        hitbox.onMouseDown = (e) => {
          setCursor("grabbing");
          hitbox.data.isDragging = true;

          const { lastPhaseY, lastRotX } = hitbox.data;

          const { center, radius } = hitbox.data;
          const rel = e.point.subtract(center);
          const startVx = clamp(rel.x / radius, -1, 1);
          const startVy = clamp(rel.y / radius, -1, 1);

          hitbox.data.dragOffset = {
            phaseY: lastPhaseY - (startVy + 1) / 2,
            rotX:   lastRotX - startVx,
          };


        }
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