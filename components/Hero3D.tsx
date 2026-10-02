import React from 'react'
/** Icone crypto in stile 3D per la home: disegnate in SVG (spessore, luce e ombra), nessuna immagine da caricare. */
import type { ReactNode } from 'react'

const Grad = ({ id, a, b, x2 = 0, y2 = 1 }: { id: string; a: string; b: string; x2?: number; y2?: number }) => (
  <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
    <stop offset="0" stopColor={a} />
    <stop offset="1" stopColor={b} />
  </linearGradient>
)

function Coin() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hc1" a="#fff0a8" b="#f2a100" x2={0.6} y2={1} /></defs>
      <circle cx="60" cy="70" r="42" fill="#a86b00" />
      <circle cx="60" cy="63" r="42" fill="#d98a00" />
      <circle cx="60" cy="60" r="42" fill="url(#hc1)" />
      <circle cx="60" cy="60" r="32" fill="none" stroke="#c98200" strokeWidth="3.5" />
      <rect x="49" y="32" width="5" height="9" rx="2" fill="#a86400" /><rect x="63" y="32" width="5" height="9" rx="2" fill="#a86400" />
      <rect x="49" y="79" width="5" height="9" rx="2" fill="#a86400" /><rect x="63" y="79" width="5" height="9" rx="2" fill="#a86400" />
      <path d="M46 40h16c9 0 13 4 13 10 0 5-3 8-8 9 6 1 10 4 10 10 0 7-5 11-15 11H46z M56 48v8h6c3 0 5-1.500 5-4s-2-4-5-4z M56 63v9h7c4 0 6-2 6-4.500S67 63 63 63z" fill="#a86400" fillRule="evenodd" />
      <path d="M26 46a36 36 0 0 1 30-22" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function Wallet() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hw1" a="#a9b6ff" b="#4a5ff0" /><Grad id="hw2" a="#ffe566" b="#f2b800" /><Grad id="hw3" a="#fff6c4" b="#ffd23d" /></defs>
      <rect x="22" y="22" width="62" height="30" rx="7" fill="url(#hw3)" transform="rotate(-8 50 40)" />
      <rect x="12" y="44" width="96" height="62" rx="15" fill="#25309f" />
      <rect x="12" y="38" width="96" height="62" rx="15" fill="url(#hw1)" />
      <path d="M20 52a10 10 0 0 1 10-8h60" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      <rect x="76" y="58" width="38" height="26" rx="11" fill="#b88a00" />
      <rect x="76" y="55" width="38" height="26" rx="11" fill="url(#hw2)" />
      <circle cx="91" cy="68" r="5" fill="#8a6500" />
    </svg>
  )
}

function Exchange() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="he1" a="#9ff7da" b="#0fae83" x2={0.5} y2={1} /></defs>
      <circle cx="60" cy="70" r="42" fill="#0a7f61" />
      <circle cx="60" cy="63" r="42" fill="#0c9873" />
      <circle cx="60" cy="60" r="42" fill="url(#he1)" />
      <g fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 48h50M70 34l15 14-15 14" />
        <path d="M86 74H36M50 60 35 74l15 14" />
      </g>
      <path d="M26 44a36 36 0 0 1 28-20" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function Magnifier() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hm1" a="#6f82ff" b="#1c2a9e" /><Grad id="hm2" a="#ffe566" b="#f0a800" x2={1} y2={1} /><Grad id="hm3" a="#e9f0ff" b="#8fb4ff" /></defs>
      <line x1="80" y1="86" x2="106" y2="112" stroke="#a87300" strokeWidth="17" strokeLinecap="round" />
      <line x1="78" y1="82" x2="104" y2="108" stroke="url(#hm2)" strokeWidth="16" strokeLinecap="round" />
      <circle cx="52" cy="56" r="34" fill="#141e78" />
      <circle cx="52" cy="52" r="34" fill="url(#hm1)" />
      <circle cx="52" cy="52" r="25" fill="url(#hm3)" fillOpacity=".92" />
      <path d="M34 46a19 19 0 0 1 14-14" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="62" cy="64" r="3.500" fill="#fff" fillOpacity=".7" />
    </svg>
  )
}

function Shield() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hs1" a="#8bf5b4" b="#12a152" x2={0.4} y2={1} /></defs>
      <path d="M60 16 100 30v30c0 25-17 42-40 52C37 102 20 85 20 60V30z" transform="translate(0 7)" fill="#0b6e36" />
      <path d="M60 14 100 28v30c0 25-17 42-40 52C37 100 20 83 20 58V28z" fill="url(#hs1)" />
      <path d="M60 14 20 28v30c0 25 17 42 40 52z" fill="#fff" fillOpacity=".16" />
      <path d="M41 58l13 13 26-27" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Key() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hk1" a="#fff0a0" b="#eea500" x2={1} y2={1} /></defs>
      <g transform="rotate(-35 60 60)">
        <g fill="#a87300" transform="translate(0 6)"><circle cx="30" cy="60" r="24" /><rect x="46" y="54" width="68" height="13" rx="6" /><rect x="88" y="64" width="10" height="17" rx="3" /><rect x="102" y="64" width="9" height="12" rx="3" /></g>
        <g fill="url(#hk1)"><circle cx="30" cy="60" r="24" /><rect x="46" y="54" width="68" height="13" rx="6" /><rect x="88" y="64" width="10" height="17" rx="3" /><rect x="102" y="64" width="9" height="12" rx="3" /></g>
        <circle cx="30" cy="60" r="9" fill="#2533b8" />
        <path d="M14 50a20 20 0 0 1 12-10" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Chart() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hh1" a="#3a4bd0" b="#141e78" /><Grad id="hh2" a="#7bf2b0" b="#14a85a" /><Grad id="hh3" a="#ff9aa8" b="#e03450" /></defs>
      <rect x="10" y="22" width="100" height="90" rx="16" fill="#0d1450" />
      <rect x="10" y="16" width="100" height="90" rx="16" fill="url(#hh1)" />
      <path d="M22 88 46 66l16 10 30-30" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" />
      <g strokeLinecap="round"><line x1="34" y1="42" x2="34" y2="92" stroke="#14a85a" strokeWidth="3" /><line x1="60" y1="34" x2="60" y2="84" stroke="#e03450" strokeWidth="3" /><line x1="86" y1="28" x2="86" y2="76" stroke="#14a85a" strokeWidth="3" /></g>
      <rect x="27" y="54" width="14" height="30" rx="4" fill="url(#hh2)" />
      <rect x="53" y="44" width="14" height="30" rx="4" fill="url(#hh3)" />
      <rect x="79" y="36" width="14" height="30" rx="4" fill="url(#hh2)" />
    </svg>
  )
}

function Lock() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hl1" a="#d3b8ff" b="#7440f0" /></defs>
      <path d="M40 58V42a20 20 0 0 1 40 0v16" fill="none" stroke="#9aa0bd" strokeWidth="11" strokeLinecap="round" />
      <path d="M40 58V42a20 20 0 0 1 40 0v16" fill="none" stroke="#e6e9f7" strokeWidth="8" strokeLinecap="round" />
      <rect x="22" y="58" width="76" height="56" rx="14" fill="#4a24b0" />
      <rect x="22" y="52" width="76" height="56" rx="14" fill="url(#hl1)" />
      <circle cx="60" cy="76" r="8" fill="#3a1b8c" /><rect x="56.500" y="78" width="7" height="14" rx="3" fill="#3a1b8c" />
      <path d="M30 66a8 8 0 0 1 8-6" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function Gear() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hr1" a="#e4ebff" b="#7d92e8" /></defs>
      <g transform="translate(0 6)" fill="#3e4fb0">
        {teeth.map((a) => <rect key={a} x="50" y="10" width="20" height="24" rx="5" transform={`rotate(${a} 60 60)`} />)}
        <circle cx="60" cy="60" r="34" />
      </g>
      <g fill="url(#hr1)">
        {teeth.map((a) => <rect key={a} x="50" y="10" width="20" height="24" rx="5" transform={`rotate(${a} 60 60)`} />)}
        <circle cx="60" cy="60" r="34" />
      </g>
      <circle cx="60" cy="60" r="14" fill="#2533b8" /><circle cx="60" cy="60" r="14" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
      <path d="M32 48a30 30 0 0 1 14-14" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

function Airdrop() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="ha1" a="#fff0a0" b="#f2a800" /><Grad id="ha2" a="#8fa0ff" b="#3a4cd8" /></defs>
      <g stroke="#fff" strokeOpacity=".85" strokeWidth="2.500" strokeLinecap="round"><path d="M16 56 52 94M42 58 54 94M78 58 66 94M104 56 68 94" /></g>
      <path d="M8 58C8 28 32 10 60 10s52 18 52 48c-8-9-18-9-26 0-8-9-18-9-26 0-8-9-18-9-26 0-8-9-18-9-26 0z" transform="translate(0 6)" fill="#b87400" />
      <path d="M8 58C8 28 32 10 60 10s52 18 52 48c-8-9-18-9-26 0-8-9-18-9-26 0-8-9-18-9-26 0-8-9-18-9-26 0z" fill="url(#ha1)" />
      <path d="M60 10C44 20 38 38 42 58M60 10C76 20 82 38 78 58" fill="none" stroke="#d98a00" strokeWidth="3" />
      <path d="M22 40a40 32 0 0 1 22-24" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" />
      <rect x="44" y="98" width="32" height="22" rx="6" fill="#1f2c9c" />
      <rect x="44" y="93" width="32" height="22" rx="6" fill="url(#ha2)" />
      <circle cx="60" cy="104" r="6" fill="#ffd23d" /><circle cx="60" cy="104" r="3" fill="#c98a00" />
    </svg>
  )
}

function Faucet() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hf1" a="#f4f7ff" b="#8596d6" /><Grad id="hf2" a="#ff9a8a" b="#e03a3a" /><Grad id="hf3" a="#fff0a0" b="#f0a400" x2={0.6} y2={1} /></defs>
      <g fill="#4d5fb0" transform="translate(0 6)"><rect x="6" y="28" width="76" height="26" rx="12" /><rect x="58" y="46" width="26" height="30" rx="9" /><rect x="34" y="16" width="10" height="14" rx="3" /></g>
      <rect x="6" y="28" width="76" height="26" rx="12" fill="url(#hf1)" /><rect x="58" y="46" width="26" height="30" rx="9" fill="url(#hf1)" />
      <rect x="34" y="16" width="10" height="14" rx="3" fill="#b8c4f0" />
      <rect x="20" y="6" width="38" height="12" rx="6" fill="url(#hf2)" />
      <path d="M12 36h50" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeOpacity=".8" />
      <path d="M71 80c0 5-4 8-4 11" fill="none" stroke="#7fb4ff" strokeWidth="5" strokeLinecap="round" strokeOpacity=".8" />
      <circle cx="71" cy="106" r="13" fill="#a86b00" transform="translate(0 4)" /><circle cx="71" cy="106" r="13" fill="url(#hf3)" /><circle cx="71" cy="106" r="8" fill="none" stroke="#c98200" strokeWidth="2.500" />
      <path d="M96 66c0 4-3 6-3 9a3 3 0 0 0 6 0c0-3-3-5-3-9z" fill="#7fb4ff" />
    </svg>
  )
}

function Device() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hv1" a="#5b6390" b="#1d2244" x2={0.4} y2={1} /><Grad id="hv2" a="#f4f6ff" b="#98a4d8" /></defs>
      <g transform="rotate(-10 60 60)">
        <rect x="46" y="96" width="28" height="20" rx="5" fill="url(#hv2)" />
        <rect x="32" y="12" width="56" height="92" rx="15" fill="#0d1130" />
        <rect x="32" y="8" width="56" height="92" rx="15" fill="url(#hv1)" />
        <rect x="40" y="18" width="40" height="30" rx="6" fill="#070a24" />
        <path d="M51 34l6 6 11-12" fill="none" stroke="#5cf0a0" strokeWidth="4.500" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="48" cy="68" r="6" fill="#aab4e8" /><circle cx="72" cy="68" r="6" fill="#aab4e8" />
        <rect x="46" y="82" width="28" height="5" rx="2.500" fill="#ffd23d" />
        <path d="M36 24v50" stroke="#fff" strokeOpacity=".28" strokeWidth="3.500" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Card() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hd1" a="#b58cff" b="#3f4fe8" x2={1} y2={1} /><Grad id="hd2" a="#fff0a0" b="#e8a000" /></defs>
      <g transform="rotate(-14 60 60)">
        <rect x="6" y="36" width="108" height="70" rx="13" fill="#212e9c" />
        <rect x="6" y="28" width="108" height="70" rx="13" fill="url(#hd1)" />
        <rect x="6" y="44" width="108" height="12" fill="#1b2488" fillOpacity=".7" />
        <rect x="18" y="62" width="26" height="19" rx="5" fill="url(#hd2)" />
        <path d="M18 71h26M31 62v19" stroke="#b87a00" strokeWidth="1.500" />
        <circle cx="86" cy="76" r="11" fill="#ffd23d" fillOpacity=".95" /><circle cx="97" cy="76" r="11" fill="#fff" fillOpacity=".55" />
        <path d="M14 34a10 10 0 0 1 9-5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Rocket() {
  return (
    <svg viewBox="0 0 120 120">
      <defs><Grad id="hr2" a="#ffffff" b="#aebcf5" x2={1} y2={0} /><Grad id="hr3" a="#fff1a0" b="#ff6a1a" /></defs>
      <g transform="rotate(38 60 60)">
        <path d="M51 88Q60 124 69 88Z" fill="url(#hr3)" />
        <path d="M50 70 31 92l19-5zM70 70l19 22-19-5z" fill="#c92c4c" />
        <path d="M60 6c20 18 22 50 11 82H49C38 56 40 24 60 6z" transform="translate(0 4)" fill="#6a78c8" />
        <path d="M60 6c20 18 22 50 11 82H49C38 56 40 24 60 6z" fill="url(#hr2)" />
        <path d="M60 6C40 24 38 56 49 88H56C48 56 50 26 60 6z" fill="#fff" fillOpacity=".55" />
        <circle cx="60" cy="44" r="11" fill="#2a3ccf" /><circle cx="60" cy="44" r="7" fill="#7fa0ff" /><circle cx="57" cy="41" r="2.500" fill="#fff" />
        <path d="M44 62h32" stroke="#e03450" strokeWidth="5" />
      </g>
    </svg>
  )
}

const ICONS: { cls: string; el: ReactNode }[] = [
  { cls: 'coin', el: <Coin /> }, { cls: 'wallet', el: <Wallet /> }, { cls: 'exchange', el: <Exchange /> },
  { cls: 'magnifier', el: <Magnifier /> }, { cls: 'shield', el: <Shield /> }, { cls: 'device', el: <Device /> },
  { cls: 'key', el: <Key /> }, { cls: 'chart', el: <Chart /> }, { cls: 'lock', el: <Lock /> },
  { cls: 'gear', el: <Gear /> }, { cls: 'rocket', el: <Rocket /> }, { cls: 'card', el: <Card /> },
  { cls: 'airdrop', el: <Airdrop /> }, { cls: 'faucet', el: <Faucet /> },
]

export function Hero3D() {
  return (
    <div className="hero-icons" aria-hidden="true">
      {ICONS.map((i) => <span key={i.cls} className={`h3d h3d-${i.cls}`}>{i.el}</span>)}
    </div>
  )
}
