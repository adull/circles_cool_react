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
          setTimeout(drawPattern, 100)

          paper.view.onFrame = () => {
            // animate(event);
            updateCircles
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

    const getCircleRotation = (cx, cy, mouseX, mouseY) => {
      const dx = mouseX - cx;
      const dy = mouseY - cy;
    
      // normalize to [-1,1] range (optional scaling factor)
      const angleX = dx / 200; // tilt horizontally
      const angleY = dy / 200; // tilt vertically
    
      return { angleX, angleY };
    };

    // const mousePos = { x: 0, y: 0 };

    useEffect(() => {
      loggingRef.current = logging
    }, [logging])

    const initPaper = () => {
      paper.setup("paper")
    }

    let t = 0;
    let frameCount = 0
    const animated = (event) => {
      frameCount++;
      t += event.delta * 0.5; // advance phase
      const phase = (Math.sin(t) + 1) / 2; // 0 → 1 → 0
    
      const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
      let d 
    
      verticals.forEach((path) => {
        const { rowY, circleId } = path.data;
        // console.log({ rowY, circleId})
        if (rowY == null || circleId == null) return;
        // console.log({ rowY, circleId})
    
        // Circle center (cx, cy)
        const cx = circleId * 160; // same spacing you used in drawPattern
        const cy = rowY;              // base row height
    
        // Radii for ellipse projection
        const rx = 60;        // horizontal radius (matches circleRadius)
        const ry = 20;        // vertical radius (smaller → eye-level squish)
    
        // Parametric angle based on time + circle index (so circles spin independently)
        const angle = t + circleId * 0.3;
        // console.log({ angle })
    
        // New coordinates on the ellipse
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        console.log({ x, y})
    
        // Move the path to this absolute position
        const { x: oldX, y: oldY } = path.position;

        
        const dx = x - oldX;
        const dy = y - oldY;
        // console.log({ dx, dy})
        path.translate(new paper.Point(dx, dy));
      });
    
      if (loggingRef.current && frameCount % 60 === 0) {
        console.log(d)
        console.log("phase", phase, "t", t);
      }
    };

    const updateCircles = () => {
      const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
    
      // group by circle
      const circles = {};
      verticals.forEach(path => {
        const rowY = path.data?.rowY;
        const circleId = path.data?.circleId;
        if (rowY == null || circleId == null) return;
    
        if (!circles[circleId]) circles[circleId] = { rows: {}, cx: null, cy: null };
        if (!circles[circleId].rows[rowY]) circles[circleId].rows[rowY] = [];
        circles[circleId].rows[rowY].push(path);
      });
    
      // Now apply transforms
      Object.entries(circles).forEach(([circleId, circle]) => {
        // find center of this circle (cx, cy)
        // (your drawPattern already defines row + col spacing)
        const [row, col] = circleId.split("-").map(Number);
        const cx = (col * 2 + 1) * 160;              // same spacing logic as drawPattern
        const cy = (row + 1) * (paper.view.size.height / 4);
    
        const { angleX, angleY } = getCircleRotation(cx, cy, mousePosRef.current.x, mousePosRef.current.y);
    
        const keys = Object.keys(circle.rows).map(Number).sort((a, b) => a - b);
        const n = keys.length;
    
        for (let i = 0; i < n; i++) {
          const mirrorIndex = n - 1 - i;
    
          const yOriginal = keys[i];
          const yMirror   = keys[mirrorIndex];
          const yInterp   = yOriginal * (1 - (angleY + 0.5)) + yMirror * (angleY + 0.5);
    
          circle.rows[keys[i]].forEach(path => {
            const { x } = path.position;
            path.position = new paper.Point(x + angleX * 20, yInterp); // shift x a bit with angleX
          });
        }
      });
    };

// const animate = (event) => {
//   const X_ROTATION = true
//   frameCount++;
//   const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
  
//   // circles[circleId][rowY] -> Path[]
//   const circles = {};
//   verticals.forEach(path => {
//     if(X_ROTATION) {
//       // const pathPosition  = {x: path.position.x - 500, y: path.position.y}
//       // console.log({ pathPosition})
//       path.rotate(1, path.position);     
//     }  
  
//     const rowY = path.data?.rowY;
//     const circleId = path.data?.circleId;
//     if (rowY == null || circleId == null) return;

//     if (!circles[circleId]) circles[circleId] = {};
//     if (!circles[circleId][rowY]) circles[circleId][rowY] = [];
//     circles[circleId][rowY].push(path);
//   });

//   // phase 0..1
//   t += event.delta * 0.5;
//   const phase = (Math.sin(t) + 1) / 2;
//   // t += event.delta * 0.5; // speed factor
// // const phase = (t % 1);

//   // For each circle, mirror top/bottom rows within that circle only
//   Object.entries(circles).forEach(([circleId, rowsByY]) => {
//     const keys = Object.keys(rowsByY).map(Number).sort((a, b) => a - b);
//     const n = keys.length;

//     for (let i = 0; i < n; i++) {
//       const mirrorIndex = n - 1 - i;

//       const yOriginal = keys[i];
//       const yMirror   = keys[mirrorIndex];
//       const yInterp   = yOriginal * (1 - phase) + yMirror * phase;

//       rowsByY[keys[i]].forEach(path => {
//         const { x } = path.position;
//         // set absolute y to avoid drift
//         path.position = new paper.Point(x, yInterp);
//       });
//     }
//   });

//   // ✅ your logging block
//   if (loggingRef.current) {
//     if (frameCount % 30 === 0) {
//       console.log("phase", phase, "circles", circles);
//     }
//   }
// };


    
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
    
        // flush last vertical if the row ends while still inside a circle
        if (inSegment) {
          new paper.Path.Line({
            from: [segStart, y],
            to: [view.size.width, y],
            strokeColor: 'red',
            strokeWidth: bandHeight,
            name: `vertical-segment-row-${y}`,
            data: { rowY: y, circleId: segCircleId }
          })
          // .sendToBack();
        }
      }
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
                    // width: display.width,
                    height: display.height,
                }}
            >                
            </canvas>
        </div>
    )
}

export default Paper;