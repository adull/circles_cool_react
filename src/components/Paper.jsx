import React, { useState, useEffect, useRef } from 'react'
import { paper } from 'paper'

const Paper = () => {
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

    const initPaper = () => {
      paper.setup("paper")
    }

    const animate = (event) => {
      const verticals = paper.project.getItems({ name: "vertical-segment-row" });
      verticals.forEach((path) => {
        path.rotate(5, path.position); // rotate 1° per frame around its center
      });
    }
    

    const drawPattern = () => {
      console.log(`umm do this`)
      const { view } = paper;
      const bandHeight = 8;       // thickness of each stripe
      const circleRadius = 60;    // controls "circle size"
      const circleSpacing = 160;  // horizontal spacing of circles
      const rows = 3;             // number of rows of circle centers
    
      // if (paper.project && paper.project.activeLayer) {
      //   paper.project.activeLayer.removeChildren();
      // }
    
      // background = continuous horizontal bands
      for (let y = 0; y < view.size.height; y += bandHeight) {
        const shade = (y % (bandHeight * 8)) / (bandHeight * 8);
        const strokeColor = new paper.Color(shade);
      
        let inSegment = false;
        let segStart = null;
      
        for (let x = 0; x < view.size.width; x += bandHeight) {
          let insideCircle = false;
      
          // --- check if (x, y) is inside a circle ---
          for (let row = 0; row < rows; row++) {
            const yCenter = (row + 1) * (view.size.height / (rows + 1));
            for (let cx = circleSpacing; cx < view.size.width; cx += circleSpacing * 2) {
              const dx = x - cx;
              const dy = y - yCenter;
              if (Math.sqrt(dx * dx + dy * dy) < circleRadius) {
                insideCircle = true;
              }
            }
          }
      
          if (insideCircle) {
            // start of a new vertical segment
            if (!inSegment) {
              inSegment = true;
              segStart = x;
            }
          } else {
            // if we were inside, close the segment
            if (inSegment) {
              new paper.Path.Line({
                from: [segStart, y],
                to: [x, y],
                strokeColor,
                strokeWidth: bandHeight,
                name: `vertical-segment-row`
              });
              inSegment = false;
              segStart = null;
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
      
        // flush last vertical if row ends inside a circle
        if (inSegment) {
          new paper.Path.Line({
            from: [segStart, y],
            to: [view.size.width, y + bandHeight],
            strokeColor,
            strokeWidth: bandHeight,
            name: `vertical-segment-row-${y}`
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