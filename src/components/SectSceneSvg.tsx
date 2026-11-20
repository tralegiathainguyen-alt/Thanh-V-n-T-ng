import React from 'react';

export function SectSceneSvg() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full pointer-events-none select-none"
      aria-label="Toàn cảnh thủy mặc Thanh Vân Tiên Tông"
    >
      <defs>
        {/* Sky & Misty Celadon Atmosphere */}
        <linearGradient id="skyWash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCEBE5" />
          <stop offset="48%" stopColor="#EBF4EE" />
          <stop offset="100%" stopColor="#CFE3DA" />
        </linearGradient>

        {/* Distant Ink Mountains */}
        <linearGradient id="farMtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#77A79B" stopOpacity="0.88" />
          <stop offset="65%" stopColor="#A9CFC3" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E6F1EB" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="midMtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F8A7C" stopOpacity="0.92" />
          <stop offset="65%" stopColor="#89B9AA" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#D7EAE2" stopOpacity="0.2" />
        </linearGradient>

        {/* Plateau Grass & Cliff Rock */}
        <linearGradient id="plateauGrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C8DFBD" />
          <stop offset="50%" stopColor="#B4D3AA" />
          <stop offset="100%" stopColor="#94BC93" />
        </linearGradient>

        <linearGradient id="cliffRock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C7D76" />
          <stop offset="60%" stopColor="#3B5B57" />
          <stop offset="100%" stopColor="#26403E" />
        </linearGradient>

        {/* Golden Palace Roof */}
        <linearGradient id="goldRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5D378" />
          <stop offset="55%" stopColor="#D8A33E" />
          <stop offset="100%" stopColor="#9E6D20" />
        </linearGradient>

        {/* Jade Tile Roof */}
        <linearGradient id="jadeRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5E9A8C" />
          <stop offset="60%" stopColor="#35665D" />
          <stop offset="100%" stopColor="#20423D" />
        </linearGradient>

        {/* Stone Courtyard Path */}
        <linearGradient id="stonePath" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E5E0D3" />
          <stop offset="50%" stopColor="#F2EDE1" />
          <stop offset="100%" stopColor="#D6CFC0" />
        </linearGradient>

        {/* Waterfall & Pond */}
        <linearGradient id="waterfallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4FBFA" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#A9DED7" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>

        <radialGradient id="mistCloud" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#EDF6F1" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#EDF6F1" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="baguaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#5EEAD4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#B91C1C" />
        </radialGradient>
      </defs>

      {/* 1. SKY BACKGROUND */}
      <rect width="1600" height="900" fill="url(#skyWash)" />

      {/* Subtle Sun / Moon Ink Wash Halo */}
      <circle cx="800" cy="180" r="140" fill="#FFFDF5" opacity="0.45" />

      {/* 2. FAR CELADON MOUNTAIN PEAKS */}
      <g stroke="#3A5D56" strokeWidth="1.4" strokeOpacity="0.35">
        <path d="M-40 430 L120 190 L210 265 L340 120 L480 280 L590 155 L740 310 L890 140 L1020 275 L1170 110 L1320 245 L1460 150 L1640 340 L1640 540 L-40 540 Z" fill="url(#farMtn)" />
        {/* Far waterfall */}
        <path d="M518 225 Q528 280 515 350 L542 350 Q552 280 538 225 Z" fill="url(#waterfallGrad)" stroke="none" />
      </g>

      {/* 3. MIDGROUND INK PEAKS (LEFT & RIGHT FRAMING) */}
      <g stroke="#294641" strokeWidth="2" strokeLinejoin="round">
        {/* Left towering peak */}
        <path d="M-40 620 L40 320 L115 245 L195 340 L265 215 L370 390 L440 580 Z" fill="url(#midMtn)" />
        <path d="M115 245 L145 365 M265 215 L245 360" stroke="#223B37" strokeWidth="1.5" opacity="0.45" />
        {/* Right towering peak + waterfall */}
        <path d="M1180 520 L1290 250 L1375 160 L1470 295 L1545 230 L1640 390 L1640 720 L1180 720 Z" fill="url(#midMtn)" />
        <path d="M1375 160 L1350 340 M1470 295 L1445 430" stroke="#223B37" strokeWidth="1.5" opacity="0.45" />
        {/* Right waterfall cascading into clouds */}
        <path d="M1395 450 Q1415 560 1398 730 L1436 730 Q1450 560 1425 450 Z" fill="url(#waterfallGrad)" stroke="none" />
      </g>

      {/* Midground mist veil */}
      <ellipse cx="320" cy="430" rx="280" ry="70" fill="url(#mistCloud)" />
      <ellipse cx="1280" cy="410" rx="310" ry="78" fill="url(#mistCloud)" />

      {/* 4. FLOATING ISOMETRIC SECT MOUNTAIN PLATEAU */}
      <g>
        {/* Craggy cliff underside */}
        <path
          d="M190 615 L440 430 L1080 280 L1430 475 L1390 650 L1140 830 L760 885 L360 825 L195 705 Z"
          fill="url(#cliffRock)"
          stroke="#1D3330"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Ink cliff striations */}
        <path
          d="M280 680 L320 790 M460 760 L485 840 M670 815 L680 875 M940 810 L920 865 M1190 710 L1160 810 M1330 595 L1315 685"
          stroke="#152624"
          strokeWidth="2"
          opacity="0.55"
        />

        {/* Emerald Grassy Top Surface */}
        <path
          d="M210 600 L480 415 L865 305 L1125 275 L1410 465 L1295 625 L1035 765 L750 820 L425 775 Z"
          fill="url(#plateauGrass)"
          stroke="#2A4A43"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Subtle ink contour grass patches */}
        <ellipse cx="640" cy="490" rx="180" ry="65" fill="#A5C99F" opacity="0.55" />
        <ellipse cx="1010" cy="610" rx="210" ry="80" fill="#9BC497" opacity="0.5" />

        {/* Main White-Stone Courtyard Avenue (Sơn Môn -> Chính Điện) */}
        <polygon
          points="430,685 1030,365 1135,418 535,742"
          fill="url(#stonePath)"
          stroke="#6C6A60"
          strokeWidth="2"
        />
        {/* Paving stone seams */}
        <g stroke="#9D9685" strokeWidth="1.2" opacity="0.7">
          <line x1="510" y1="642" x2="615" y2="698" />
          <line x1="590" y1="600" x2="695" y2="655" />
          <line x1="670" y1="557" x2="775" y2="612" />
          <line x1="750" y1="515" x2="855" y2="570" />
          <line x1="830" y1="472" x2="935" y2="527" />
          <line x1="910" y1="430" x2="1015" y2="485" />
          <line x1="990" y1="387" x2="1095" y2="442" />
        </g>

        {/* Secondary Stone Terrace under Chính Điện */}
        <polygon
          points="940,350 1135,260 1335,360 1140,455"
          fill="#EAE4D5"
          stroke="#655E51"
          strokeWidth="2"
        />
      </g>

      {/* =====================================================================
          5. SEVEN INTERACTIVE LANDMARK BUILDINGS (ALIGNED WITH BUILDING_DEFS)
          ===================================================================== */}

      {/* [1] CHÍNH ĐIỆN TÔNG MÔN — mapX: 69% (1104), mapY: 38% (342) */}
      <g transform="translate(1104, 342)">
        {/* Stepped foundation */}
        <polygon points="-135,28 0,-36 140,32 5,96" fill="#D5CCB8" stroke="#474137" strokeWidth="2" />
        <polygon points="-135,28 5,96 5,112 -135,44" fill="#B5AA95" stroke="#474137" strokeWidth="1.8" />
        <polygon points="5,96 140,32 140,48 5,112" fill="#9E937E" stroke="#474137" strokeWidth="1.8" />

        {/* Lower Palace Walls & Vermilion Columns */}
        <polygon points="-100,15 -5,62 -5,-2 -100,-48" fill="#8B3A2E" stroke="#361E19" strokeWidth="1.8" />
        <polygon points="-5,62 100,12 100,-50 -5,-2" fill="#6F2B22" stroke="#361E19" strokeWidth="1.8" />
        {/* Golden doorway & lattice windows */}
        <polygon points="-64,32 -32,48 -32,5 -64,-11" fill="#3B1A15" stroke="#E5BE67" strokeWidth="1.8" />
        <line x1="-48" y1="-3" x2="-48" y2="40" stroke="#E5BE67" strokeWidth="1.5" />
        <polygon points="22,38 72,14 72,-15 22,9" fill="#F2D794" fillOpacity="0.35" stroke="#E5BE67" strokeWidth="1.5" />

        {/* Lower Golden Upturned Roof */}
        <path
          d="M-138,-35 Q-72,-45 -5,-12 Q65,-46 138,-38 L108,-68 L-5,-105 L-112,-66 Z"
          fill="url(#goldRoof)"
          stroke="#4E3410"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Roof ridge lines */}
        <path d="M-112,-66 L-5,-12 M108,-68 L-5,-12 M-5,-105 L-5,-12" stroke="#7A5016" strokeWidth="1.4" opacity="0.65" />

        {/* Upper Tier Sanctuary */}
        <polygon points="-66,-68 -5,-38 -5,-78 -66,-106" fill="#984134" stroke="#361E19" strokeWidth="1.6" />
        <polygon points="-5,-38 64,-70 64,-108 -5,-78" fill="#762E24" stroke="#361E19" strokeWidth="1.6" />

        {/* Upper Golden Imperial Roof + Finial */}
        <path
          d="M-104,-96 Q-50,-102 -5,-76 Q46,-104 102,-98 L68,-132 L-5,-158 L-72,-130 Z"
          fill="url(#goldRoof)"
          stroke="#4E3410"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Golden roof ridge & ornaments */}
        <line x1="-54" y1="-142" x2="48" y2="-142" stroke="#FCE7A2" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="-5" cy="-164" r="5" fill="#FDE047" stroke="#6E4712" strokeWidth="1.5" />
      </g>

      {/* [2] LUYỆN ĐAN LÔ — mapX: 48% (768), mapY: 42% (378) */}
      <g transform="translate(768, 378)">
        {/* Shadow & stone hearth base */}
        <ellipse cx="0" cy="48" rx="68" ry="26" fill="#324B45" opacity="0.3" />
        <ellipse cx="0" cy="36" rx="54" ry="22" fill="#8D8B7E" stroke="#3C3B34" strokeWidth="2" />

        {/* Giant Bronze-Jade Alchemy Furnace Body */}
        <path
          d="M-46,32 C-56,-8 -36,-42 0,-46 C36,-42 56,-8 46,32 C28,46 -28,46 -46,32 Z"
          fill="#637E77"
          stroke="#233733"
          strokeWidth="2.4"
        />
        {/* Metallic banding */}
        <path d="M-44,6 Q0,20 44,6" fill="none" stroke="#D4AF63" strokeWidth="3" />
        <path d="M-38,-22 Q0,-10 38,-22" fill="none" stroke="#D4AF63" strokeWidth="2.4" />

        {/* Glowing Furnace Firebox */}
        <path d="M-14,38 L-14,14 Q0,2 14,14 L14,38 Z" fill="url(#fireGlow)" stroke="#4A2511" strokeWidth="2" />

        {/* Chimney Flue */}
        <rect x="-14" y="-88" width="28" height="48" rx="4" fill="#526B66" stroke="#233733" strokeWidth="2" />
        <ellipse cx="0" cy="-88" rx="18" ry="6" fill="#7E9C94" stroke="#233733" strokeWidth="2" />

        {/* Rising Alchemy Spirit Steam */}
        <path
          d="M-2,-98 Q-18,-122 4,-142 Q22,-160 2,-182"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M8,-102 Q24,-128 6,-152"
          fill="none"
          stroke="#EAF7F2"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Firewood stack & clay jars */}
        <ellipse cx="-48" cy="46" rx="11" ry="13" fill="#B58550" stroke="#4D3418" strokeWidth="1.8" />
        <ellipse cx="46" cy="48" rx="14" ry="8" fill="#A07240" stroke="#4D3418" strokeWidth="1.6" />
      </g>

      {/* [3] LUYỆN KHÍ CÁC — mapX: 40% (640), mapY: 50% (450) */}
      <g transform="translate(640, 450)">
        <polygon points="-76,22 0,-18 76,22 0,62" fill="#C9C1AF" stroke="#49453B" strokeWidth="2" />
        <polygon points="-58,14 0,44 0,-8 -58,-36" fill="#7D543D" stroke="#382318" strokeWidth="1.8" />
        <polygon points="0,44 58,14 58,-36 0,-8" fill="#5E3C2A" stroke="#382318" strokeWidth="1.8" />
        {/* Glowing Forge Door */}
        <polygon points="-34,26 -10,38 -10,8 -34,-4" fill="url(#fireGlow)" stroke="#382318" strokeWidth="1.6" />
        {/* Jade Tiled Roof with Gold Trim */}
        <path
          d="M-82,-24 Q-36,-32 0,-12 Q36,-32 82,-24 L56,-56 L0,-76 L-56,-56 Z"
          fill="url(#jadeRoof)"
          stroke="#1D3632"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <line x1="-38" y1="-64" x2="38" y2="-64" stroke="#E8C56E" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* [4] TÀNG KINH CÁC — mapX: 80% (1280), mapY: 53% (477) */}
      <g transform="translate(1280, 477)">
        <polygon points="-72,22 0,-16 72,22 0,60" fill="#D5CCB8" stroke="#474137" strokeWidth="2" />
        <polygon points="-54,14 0,42 0,-12 -54,-38" fill="#8D3F31" stroke="#361E19" strokeWidth="1.8" />
        <polygon points="0,42 54,14 54,-38 0,-12" fill="#6D2D22" stroke="#361E19" strokeWidth="1.8" />
        {/* Illuminated Scroll Windows */}
        <polygon points="14,24 40,10 40,-12 14,2" fill="#FCE7A2" opacity="0.65" stroke="#D4A24C" strokeWidth="1.4" />
        {/* Golden Roof */}
        <path
          d="M-78,-28 Q-36,-36 0,-14 Q36,-36 78,-28 L52,-58 L0,-78 L-52,-58 Z"
          fill="url(#goldRoof)"
          stroke="#4E3410"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="-84" r="4.5" fill="#FDE047" stroke="#6E4712" strokeWidth="1.4" />
      </g>

      {/* [5] LINH DƯỢC ĐIỀN — mapX: 64% (1024), mapY: 67% (603) */}
      <g transform="translate(1024, 603)">
        {/* Isometric terraced herb plot with wooden fence */}
        <polygon points="-118,8 0,-54 128,12 10,76" fill="#7D5E3C" stroke="#3F2D1A" strokeWidth="2.2" />
        <polygon points="-106,8 0,-46 116,12 10,66" fill="#63482C" />
        {/* Lush rows of Spirit Herbs & Jade Lotuses */}
        {[
          { x: -60, y: 2 },
          { x: -24, y: -16 },
          { x: 12, y: -32 },
          { x: -30, y: 22 },
          { x: 8, y: 4 },
          { x: 46, y: -14 },
          { x: 4, y: 40 },
          { x: 42, y: 22 },
          { x: 78, y: 6 },
        ].map((p, idx) => (
          <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
            <ellipse cx="0" cy="4" rx="14" ry="8" fill="#2F855A" stroke="#1B4D34" strokeWidth="1.4" />
            <circle cx="-4" cy="-1" r="4" fill="#68D391" />
            <circle cx="4" cy="-2" r="3.5" fill={idx % 3 === 0 ? '#FDE047' : '#81E6D9'} />
          </g>
        ))}
        {/* Wooden fence posts */}
        <path
          d="M-118,8 L-118,-10 L0,-70 L128,-4 L128,12 M0,-54 L0,-70"
          fill="none"
          stroke="#7A5630"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </g>

      {/* [6] TỤ LINH TRẬN (Sacred Pond & Bagua Formation) — mapX: 52% (832), mapY: 79% (711) */}
      <g transform="translate(832, 711)">
        {/* Spirit Aura Glow */}
        <ellipse cx="0" cy="0" rx="115" ry="56" fill="url(#baguaGlow)" />
        {/* Carved Jade Spirit Pond */}
        <ellipse cx="0" cy="4" rx="86" ry="40" fill="#6BB6B0" stroke="#2D5754" strokeWidth="2.5" />
        <ellipse cx="0" cy="4" rx="70" ry="31" fill="#8CD4CC" stroke="#E8F8F5" strokeWidth="1.4" opacity="0.85" />
        {/* Golden Bagua Octagon Seal */}
        <polygon
          points="0,-24 38,-17 54,4 38,24 0,31 -38,24 -54,4 -38,-17"
          fill="none"
          stroke="#F5D378"
          strokeWidth="2.2"
        />
        <ellipse cx="0" cy="4" rx="24" ry="11" fill="none" stroke="#FEF08A" strokeWidth="2" />
        {/* Yin-Yang Center Dot */}
        <circle cx="0" cy="4" r="5" fill="#FEF08A" />
      </g>

      {/* [7] SƠN MÔN BÍ CẢNH (Sect Entrance Archway) — mapX: 30% (480), mapY: 74% (666) */}
      <g transform="translate(480, 666)">
        {/* Stone steps base */}
        <polygon points="-68,20 0,-16 68,20 0,56" fill="#D5CCB8" stroke="#474137" strokeWidth="2" />
        {/* Left & Right Vermilion Gate Pillars */}
        <rect x="-46" y="-48" width="12" height="68" fill="#8B3A2E" stroke="#361E19" strokeWidth="1.8" />
        <rect x="34" y="-48" width="12" height="68" fill="#8B3A2E" stroke="#361E19" strokeWidth="1.8" />
        {/* Crossbeam & Golden Plaque */}
        <rect x="-56" y="-52" width="112" height="11" fill="#2A4A43" stroke="#1A2E2A" strokeWidth="1.6" />
        <rect x="-22" y="-54" width="44" height="16" rx="2" fill="#1E3331" stroke="#F0CC71" strokeWidth="1.8" />
        {/* Jade Arch Roof */}
        <path
          d="M-74,-52 Q0,-64 74,-52 L54,-74 L0,-86 L-54,-74 Z"
          fill="url(#jadeRoof)"
          stroke="#1D3632"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <line x1="-38" y1="-78" x2="38" y2="-78" stroke="#E8C56E" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      {/* 6. HANDCRAFTED INK-WASH SPIRIT PINE TREES */}
      {[
        { x: 350, y: 540, s: 1.05 },
        { x: 525, y: 390, s: 0.9 },
        { x: 925, y: 315, s: 0.95 },
        { x: 1215, y: 635, s: 1.1 },
        { x: 645, y: 740, s: 0.92 },
        { x: 1360, y: 405, s: 0.85 },
      ].map((t, i) => (
        <g key={i} transform={`translate(${t.x}, ${t.y}) scale(${t.s})`}>
          <ellipse cx="0" cy="24" rx="22" ry="8" fill="#29483F" opacity="0.28" />
          <path d="M-4,24 Q-8,2 -2,-16 Q4,-2 5,24 Z" fill="#63452E" stroke="#2E1E12" strokeWidth="1.6" />
          <ellipse cx="-14" cy="-14" rx="24" ry="13" fill="#3B7A5D" stroke="#1E4332" strokeWidth="1.8" />
          <ellipse cx="14" cy="-18" rx="22" ry="12" fill="#4B8E6C" stroke="#1E4332" strokeWidth="1.8" />
          <ellipse cx="0" cy="-30" rx="24" ry="14" fill="#5FA37D" stroke="#1E4332" strokeWidth="1.8" />
        </g>
      ))}

      {/* 7. FOREGROUND SEA OF CLOUDS FRAMING BOTTOM EDGES */}
      <g opacity="0.72">
        <ellipse cx="160" cy="855" rx="260" ry="72" fill="url(#mistCloud)" />
        <ellipse cx="1440" cy="845" rx="290" ry="82" fill="url(#mistCloud)" />
        <ellipse cx="1220" cy="885" rx="240" ry="60" fill="url(#mistCloud)" />
        <ellipse cx="420" cy="885" rx="220" ry="56" fill="url(#mistCloud)" />
      </g>
    </svg>
  );
}

export function CombatBackdropSvg() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 w-full h-full opacity-35 select-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="combatMoon" cx="50%" cy="32%" r="40%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#2D6A62" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0E1E1E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="combatPeak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#284F4A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0C1919" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#combatMoon)" />
      <circle cx="800" cy="240" r="110" fill="#FBF2D0" opacity="0.22" />
      <path
        d="M-40 620 L180 340 L340 460 L560 280 L760 490 L980 310 L1180 470 L1420 260 L1640 520 L1640 920 L-40 920 Z"
        fill="url(#combatPeak)"
      />
      {/* Subtle Bagua Arena Floor Ring */}
      <ellipse cx="800" cy="540" rx="540" ry="165" fill="none" stroke="#D4A24C" strokeWidth="2" opacity="0.3" />
      <ellipse cx="800" cy="540" rx="380" ry="110" fill="none" stroke="#5EEAD4" strokeWidth="1.5" strokeDasharray="10 8" opacity="0.28" />
    </svg>
  );
}
