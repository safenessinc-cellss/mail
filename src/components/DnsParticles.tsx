import React from 'react';

const DnsParticles: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Fondo de partículas simple */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
            
            {/* Partículas estáticas decorativas */}
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-cyan-400/20"
                    style={{
                        width: Math.random() * 4 + 1 + 'px',
                        height: Math.random() * 4 + 1 + 'px',
                        top: Math.random() * 100 + '%',
                        left: Math.random() * 100 + '%',
                        animation: `float ${Math.random() * 10 + 5}s infinite ease-in-out`,
                        animationDelay: Math.random() * 5 + 's',
                    }}
                />
            ))}
        </div>
    );
};

export default DnsParticles; // <-- ESTA LÍNEA ES CRUCIAL
