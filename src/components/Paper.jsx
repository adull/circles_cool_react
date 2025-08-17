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
            drawLine()
            
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

      const drawLine = () => {
        const { view } = paper;

        new paper.Path({
        segments: [
            [0, view.size.height],
            [view.size.width, 0]                 
        ],
        strokeColor: 'black',
        strokeWidth: 2,
        strokeCap: 'round',
        name: 'pathToFind'
        });
      }

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