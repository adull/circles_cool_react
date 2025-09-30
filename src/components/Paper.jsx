import React, { useState, useEffect, useRef } from 'react'
import { paper } from 'paper'

const Paper = ({ logging }) => {
    const loggingRef = useRef(logging);
    const parentRef = useRef(null)
    const childRef = useRef(null)

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

          paper.view.onFrame = (event) => {
            animate(event);
          };
          
        }
      });

    
    
    
      observer.observe(element);
    
      return () => {
        observer.unobserve(element);
        observer.disconnect();
      };
    }, []);

    useEffect(() => {
      loggingRef.current = logging
    }, [logging])

    const initPaper = () => {
      paper.setup("paper")
    }

    let t = 0;
    let frameCount = 0
    const animated = (event) => {
      const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });
      verticals.forEach((path) => {
        path.rotate(1, path.position); 
      });
    }

const animate = (event) => {
  frameCount++;

  const verticals = paper.project.getItems({ name: /^vertical-segment-row-/ });

  // circles[circleId][rowY] -> Path[]
  const circles = {};
  verticals.forEach(path => {
    const rowY = path.data?.rowY;
    const circleId = path.data?.circleId;
    if (rowY == null || circleId == null) return;

    if (!circles[circleId]) circles[circleId] = {};
    if (!circles[circleId][rowY]) circles[circleId][rowY] = [];
    circles[circleId][rowY].push(path);
  });

  // phase 0..1
  t += event.delta * 0.5;
  const phase = (Math.sin(t) + 1) / 2;
  // t += event.delta * 0.5; // speed factor
// const phase = (t % 1);

  // For each circle, mirror top/bottom rows within that circle only
  Object.entries(circles).forEach(([circleId, rowsByY]) => {
    const keys = Object.keys(rowsByY).map(Number).sort((a, b) => a - b);
    const n = keys.length;

    for (let i = 0; i < n; i++) {
      const mirrorIndex = n - 1 - i;

      const yOriginal = keys[i];
      const yMirror   = keys[mirrorIndex];
      const yInterp   = yOriginal * (1 - phase) + yMirror * phase;

      rowsByY[keys[i]].forEach(path => {
        const { x } = path.position;
        // set absolute y to avoid drift
        path.position = new paper.Point(x, yInterp);
      });
    }
  });

  // ✅ your logging block
  if (loggingRef.current) {
    if (frameCount % 30 === 0) {
      console.log("phase", phase, "circles", circles);
    }
  }
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
              });
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
            strokeColor,
            strokeWidth: bandHeight,
            name: `vertical-segment-row-${y}`,
            data: { rowY: y, circleId: segCircleId }
          });
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