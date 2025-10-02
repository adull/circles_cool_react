import React, {useState, useEffect } from 'react'
import Paper from './Paper'

const Body = () => {
    const [height, setHeight] = useState(300)

    useEffect(() => {
        const bullshitHeight = 100
        setHeight(window.innerHeight - bullshitHeight)
    }, [])

    
    return (
        <div className="container mx-auto pb-6" style={{ height }}>
            <div className="h-[100%] w-full">
                <Paper /> 
            </div>
        </div>
    );
}

export default Body;
