export const UbiquityLogo = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 512 512" fill="none" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    {/* Constitution boundary */}
    <circle cx="256" cy="256" r="240" stroke="hsl(180,100%,67%)" strokeWidth="6" fill="none" opacity="0.5"/>
    
    {/* The U — Ubiquity */}
    <path d="M176 160 L176 300 Q176 380 256 380 Q336 380 336 300 L336 160" 
          stroke="hsl(180,100%,67%)" strokeWidth="20" strokeLinecap="round" fill="none"/>
    
    {/* Conductor diamond */}
    <polygon points="256,230 280,256 256,282 232,256" fill="hsl(42,100%,60%)" opacity="0.9"/>
    
    {/* Tension lines */}
    <line x1="100" y1="256" x2="176" y2="256" stroke="hsl(30,100%,55%)" strokeWidth="4" opacity="0.5" strokeDasharray="6 6"/>
    <line x1="336" y1="256" x2="412" y2="256" stroke="hsl(30,100%,55%)" strokeWidth="4" opacity="0.5" strokeDasharray="6 6"/>
    <line x1="256" y1="80" x2="256" y2="160" stroke="hsl(280,60%,55%)" strokeWidth="4" opacity="0.4"/>
    <line x1="256" y1="380" x2="256" y2="440" stroke="hsl(280,60%,55%)" strokeWidth="4" opacity="0.4"/>
    
    {/* Signal nodes */}
    <circle cx="100" cy="256" r="10" fill="hsl(30,100%,55%)" opacity="0.8"/>
    <circle cx="412" cy="256" r="10" fill="hsl(30,100%,55%)" opacity="0.8"/>
    <circle cx="256" cy="80" r="10" fill="hsl(280,60%,55%)" opacity="0.8"/>
    <circle cx="256" cy="440" r="10" fill="hsl(280,60%,55%)" opacity="0.8"/>
    
    {/* Broadcast rings */}
    <circle cx="256" cy="256" r="120" stroke="hsl(180,100%,67%)" strokeWidth="2" fill="none" opacity="0.15"/>
    <circle cx="256" cy="256" r="160" stroke="hsl(180,100%,67%)" strokeWidth="1.5" fill="none" opacity="0.1"/>
  </svg>
);
