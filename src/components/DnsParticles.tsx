/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Componente de fondo con partículas decorativas para la interfaz de FreeMail Hub
 * @returns {JSX.Element} Elemento de partículas animadas
 */
export function DnsParticles(): JSX.Element {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Gradiente de fondo sutil */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
            
            {/* Partículas estáticas decorativas */}
            {[...Array(50)].map((_, i) => {
                // Usamos valores deterministas basados en el índice para evitar hidratación inconsistente
                const size = (i % 4) + 1;
                const top = (i * 37) % 100;
                const left = (i * 53) % 100;
                const duration = ((i * 7) % 10) + 5;
                const delay = (i * 3) % 5;
                
                return (
                    <div
                        key={i}
                        className="absolute rounded-full bg-cyan-400/20 animate-pulse"
                        style={{
                            width: size + 'px',
                            height: size + 'px',
                            top: top + '%',
                            left: left + '%',
                            animationDuration: duration + 's',
                            animationDelay: delay + 's',
                            opacity: 0.3 + (i % 5) * 0.1,
                        }}
                    />
                );
            })}
            
            {/* Partículas más brillantes (estrellas) */}
            {[...Array(10)].map((_, i) => {
                const idx = i + 50;
                const size = (idx % 3) + 2;
                const top = (idx * 31) % 100;
                const left = (idx * 47) % 100;
                
                return (
                    <div
                        key={`star-${i}`}
                        className="absolute rounded-full bg-white/20 animate-pulse"
                        style={{
                            width: size + 'px',
                            height: size + 'px',
                            top: top + '%',
                            left: left + '%',
                            animationDuration: ((i * 5) % 8) + 3 + 's',
                            animationDelay: ((i * 2) % 4) + 's',
                            opacity: 0.5 + (i % 3) * 0.15,
                        }}
                    />
                );
            })}
        </div>
    );
}

export default DnsParticles;
