import React from 'react';

const ShimmerStats = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-forest-elevated p-8 rounded-[28px] border border-leaf-900/10 h-48 animate-pulse relative overflow-hidden">
                    <div className="w-12 h-12 bg-leaf-900/20 rounded-xl mb-6"></div>
                    <div className="w-24 h-4 bg-leaf-900/20 rounded mb-4"></div>
                    <div className="w-16 h-8 bg-leaf-900/20 rounded"></div>
                </div>
            ))}
        </div>
    );
};

export default ShimmerStats;
