import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const PageTransition = ({ children }) => {
    const location = useLocation();
    const nodeRef = useRef(null);

    useEffect(() => {
        if (nodeRef.current) {
            // Force visibility to prevent black screens
            gsap.fromTo(nodeRef.current, 
                { opacity: 0, y: 5 }, 
                { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
            );
        }
    }, [location.pathname]);

    return (
        <div ref={nodeRef} key={location.pathname} className="h-full">
            {children}
        </div>
    );
};

export default PageTransition;
