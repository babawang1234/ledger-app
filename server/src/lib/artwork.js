const DEFAULT_PALETTE = ['#7c5cff', '#5b6cff', '#38d9f5']

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback
}

function shade(hex, amount = 0.5) {
  const raw = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16))
  return `#${channels.map((c) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0')).join('')}`
}

function sceneFor(purpose = '', content = {}) {
  const copy = `${content.headline || ''} ${content.subheadline || ''}`
  if (/招聘|人才|同路人|团队/.test(purpose)) return 'portrait'
  if (/电商促销|产品推广/.test(purpose)) return 'product'
  if (/市集|美食|餐饮|咖啡|甜品/.test(purpose)) return 'market'
  if (/品牌宣传/.test(purpose)) return 'sculpture'
  if (/活动宣传/.test(purpose)) return 'stage'
  if (/电商|促销|产品|新品|会员|秒杀|折扣|上新/.test(copy)) return 'product'
  if (/招聘|人才|同路人|团队/.test(copy)) return 'portrait'
  if (/市集|美食|餐饮|咖啡|甜品|果|茶/.test(copy)) return 'market'
  if (/品牌|周年|价值|理念/.test(copy)) return 'sculpture'
  return 'stage'
}

function visualSvg(scene, colors, variant) {
  const [a, b, c] = colors
  const shift = variant % 2 ? 34 : -22
  const rotation = variant === 1 ? -9 : variant === 2 ? 8 : 0
  const common = `<defs>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset=".48" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".82"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="aura"><stop stop-color="${c}" stop-opacity=".58"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <linearGradient id="shadow" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#050711" stop-opacity=".1"/><stop offset="1" stop-color="#050711" stop-opacity=".72"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <ellipse cx="510" cy="1030" rx="340" ry="82" fill="#03050c" opacity=".48" filter="url(#soft)"/>
  <ellipse cx="510" cy="820" rx="390" ry="330" fill="url(#aura)" filter="url(#blur)"/>
  <path d="M70 1040 C250 950 720 970 940 1030" fill="none" stroke="${c}" stroke-opacity=".42" stroke-width="2"/>
  <path d="M125 1090 C330 1000 710 1005 875 1080" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>`

  const scenes = {
    stage: `<g transform="translate(${shift} 0) rotate(${rotation} 500 650)">
      <path d="M130 80 L420 670 L300 745Z" fill="${a}" opacity=".12"/><path d="M870 65 L580 680 L700 745Z" fill="${c}" opacity=".14"/>
      <ellipse cx="500" cy="625" rx="282" ry="282" fill="none" stroke="${c}" stroke-opacity=".48" stroke-width="2" transform="rotate(-28 500 625)"/>
      <ellipse cx="500" cy="625" rx="235" ry="300" fill="none" stroke="#fff" stroke-opacity=".23" stroke-width="1.5" transform="rotate(42 500 625)"/>
      <circle cx="500" cy="625" r="190" fill="url(#glass)"/>
      <path d="M385 510 C435 425 590 446 632 550 C670 644 583 786 482 805 C393 790 321 652 385 510Z" fill="url(#shine)" opacity=".34"/>
      <path d="M340 700 Q500 590 660 700 L730 830 Q500 900 270 830Z" fill="#fff" opacity=".1" stroke="#fff" stroke-opacity=".35"/>
      <circle cx="731" cy="425" r="12" fill="#fff"/><circle cx="242" cy="490" r="7" fill="${c}"/><circle cx="695" cy="840" r="5" fill="#fff"/>
      <path d="M735 330v30m-15-15h30M264 360v22m-11-11h22" stroke="#fff" stroke-opacity=".78" stroke-width="2"/>
    </g>`,
    product: `<g transform="translate(${shift} 0) rotate(${rotation} 500 690)">
      <path d="M280 900 Q500 800 720 900 L800 1030 Q500 1120 200 1030Z" fill="${shade(a, .48)}" opacity=".9"/>
      <path d="M375 310 Q375 265 420 265 H580 Q625 265 625 310 V390 L675 450 Q694 475 694 510 V832 Q694 885 640 900 H360 Q306 885 306 832 V510 Q306 475 325 450 L375 390Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".46" stroke-width="3"/>
      <path d="M413 268 V188 Q413 162 440 162 H560 Q587 162 587 188 V268Z" fill="#d9e7f0" fill-opacity=".72" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
      <path d="M430 160 V120 Q430 95 455 95 H545 Q570 95 570 120 V160Z" fill="${shade(a, .18)}" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>
      <path d="M343 510 Q500 470 657 510 V790 Q500 825 343 790Z" fill="#f9f3e9" fill-opacity=".92"/>
      <path d="M360 535 Q500 505 640 535" stroke="${a}" stroke-width="5" opacity=".7"/>
      <circle cx="500" cy="636" r="42" fill="${b}" opacity=".82"/><path d="M478 636h44m-22-22v44" stroke="#fff" stroke-width="3" opacity=".9"/>
      <path d="M340 440 Q365 376 401 337" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="13" stroke-linecap="round"/>
      <path d="M690 470 Q790 406 820 330 M708 520 Q830 500 860 430" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".72"/>
      <ellipse cx="500" cy="885" rx="225" ry="52" fill="#fff" opacity=".11"/>
    </g>`,
    market: `<g transform="translate(${shift} 0) rotate(${rotation} 500 650)">
      <path d="M185 870 Q500 760 815 870 L750 1010 Q500 1080 250 1010Z" fill="${shade(a,.35)}"/>
      <circle cx="480" cy="630" r="230" fill="url(#glass)" stroke="#fff" stroke-opacity=".48" stroke-width="3"/>
      <path d="M315 505 Q420 376 560 410 Q666 440 703 556 Q622 500 535 536 Q423 585 315 505Z" fill="${shade(c,.08)}" opacity=".82"/>
      <path d="M490 414 Q505 325 585 293 Q581 365 520 428Z" fill="#7ecb83" stroke="#d4f0bb" stroke-width="3"/>
      <path d="M500 418 Q442 332 370 348 Q389 425 485 445Z" fill="#4e9c68" stroke="#c6e7a4" stroke-width="3"/>
      <path d="M337 586 Q446 514 591 542" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="18" stroke-linecap="round"/>
      <circle cx="753" cy="510" r="102" fill="${b}" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M700 484 Q754 430 806 476" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="14" stroke-linecap="round"/>
      <circle cx="260" cy="735" r="66" fill="${c}" opacity=".9"/><path d="M222 721q40-46 79-1" fill="none" stroke="#fff" stroke-opacity=".46" stroke-width="10"/>
      <path d="M690 698l34 40m-58-12l40-32" stroke="#fff" stroke-opacity=".65" stroke-width="4"/>
    </g>`,
    portrait: `<g transform="translate(${shift} 0) rotate(${rotation} 500 650)">
      <circle cx="545" cy="570" r="275" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="2"/>
      <path d="M240 1030 Q275 820 425 765 Q500 735 575 765 Q725 820 760 1030Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
      <path d="M405 540 Q405 360 535 360 Q674 360 674 545 Q674 682 548 735 Q421 699 405 540Z" fill="#c98f79" stroke="#f7d3b9" stroke-width="3"/>
      <path d="M395 540 Q360 390 485 326 Q631 278 704 411 Q729 475 683 555 Q681 460 625 441 Q557 420 503 476 Q455 523 395 540Z" fill="#202034"/>
      <path d="M405 525 Q445 492 495 463 M617 452 Q660 485 674 535" fill="none" stroke="#101321" stroke-width="16" stroke-linecap="round"/>
      <path d="M474 575h14m94 0h14" stroke="#252238" stroke-width="8" stroke-linecap="round"/>
      <path d="M511 651 Q548 675 581 650" fill="none" stroke="#8d4352" stroke-width="8" stroke-linecap="round"/>
      <path d="M330 850 Q440 790 500 920 Q559 800 677 850" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
      <circle cx="750" cy="350" r="10" fill="#fff"/><circle cx="300" cy="430" r="6" fill="${b}"/>
    </g>`,
    sculpture: `<g transform="translate(${shift} 0) rotate(${rotation} 500 650)">
      <path d="M500 245 C730 245 820 425 705 540 C585 660 340 550 330 700 C316 885 670 855 705 685 C733 550 558 510 465 600 C400 665 422 758 516 775" fill="none" stroke="url(#glass)" stroke-width="92" stroke-linecap="round"/>
      <path d="M500 245 C730 245 820 425 705 540 C585 660 340 550 330 700 C316 885 670 855 705 685" fill="none" stroke="#fff" stroke-opacity=".54" stroke-width="3"/>
      <ellipse cx="500" cy="650" rx="380" ry="320" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="2" transform="rotate(-24 500 650)"/>
      <circle cx="500" cy="650" r="292" fill="none" stroke="#fff" stroke-opacity=".17" stroke-width="1"/>
      <circle cx="765" cy="454" r="38" fill="${c}" stroke="#fff" stroke-opacity=".62" stroke-width="2"/><circle cx="230" cy="770" r="19" fill="${b}"/>
      <path d="M175 1000 Q500 870 825 1000" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"/>
    </g>`,
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet">${common}${scenes[scene] || scenes.stage}</svg>`
}

export function createArtworkDataUrl({ palette, purpose, content, variant = 0, scene }) {
  const colors = [0, 1, 2].map((i) => safeColor(palette?.[i], DEFAULT_PALETTE[i]))
  const chosenScene = scene || sceneFor(purpose, content)
  const svg = visualSvg(chosenScene, colors, variant)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
