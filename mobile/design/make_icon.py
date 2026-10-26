# Builds icon.svg (app icon), mark.svg (splash) and adaptive.svg (Android).
# Run: python3 make_icon.py
import math, random

W = 1024
CX, CY = 512, 250  # where the light comes from

DEFS = '''
    <radialGradient id="base" cx="0.5" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#383853"/>
      <stop offset="0.45" stop-color="#22233B"/>
      <stop offset="1" stop-color="#111222"/>
    </radialGradient>
    <radialGradient id="glow" cx="512" cy="250" r="430" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#E8C77E" stop-opacity="0.34"/>
      <stop offset="0.5" stop-color="#C9A35A" stop-opacity="0.09"/>
      <stop offset="1" stop-color="#C9A35A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0D0E1B" stop-opacity="0"/>
      <stop offset="0.12" stop-color="#0D0E1B" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#07080F" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.30"/>
      <stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="rayBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="dustBlur"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="reflBlur"><feGaussianBlur stdDeviation="3"/></filter>

    <!-- polished gold -->
    <linearGradient id="railGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF3C9"/>
      <stop offset="0.18" stop-color="#F4CF6E"/>
      <stop offset="0.5" stop-color="#C98F25"/>
      <stop offset="0.72" stop-color="#E9B954"/>
      <stop offset="1" stop-color="#7C4F0D"/>
    </linearGradient>
    <linearGradient id="postGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8A5A12"/>
      <stop offset="0.22" stop-color="#F6D57E"/>
      <stop offset="0.45" stop-color="#FFF3C9"/>
      <stop offset="0.7" stop-color="#D49A30"/>
      <stop offset="1" stop-color="#6E440B"/>
    </linearGradient>
    <radialGradient id="ballGold" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#FFF8DC"/>
      <stop offset="0.3" stop-color="#F3CB66"/>
      <stop offset="0.75" stop-color="#B57B1A"/>
      <stop offset="1" stop-color="#6A420A"/>
    </radialGradient>
    <linearGradient id="rod" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8E6A2C"/>
      <stop offset="0.5" stop-color="#F7E2AE"/>
      <stop offset="1" stop-color="#7A5622"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B0C1A" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#0B0C1A" stop-opacity="0.78"/>
    </linearGradient>

    <!-- beads -->
    <linearGradient id="bead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFC39A"/>
      <stop offset="0.38" stop-color="#FF8A4C"/>
      <stop offset="0.5" stop-color="#F26A2A"/>
      <stop offset="0.52" stop-color="#D9531A"/>
      <stop offset="1" stop-color="#8F2E06"/>
    </linearGradient>
    <linearGradient id="beadGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF6D2"/>
      <stop offset="0.38" stop-color="#FAD46E"/>
      <stop offset="0.5" stop-color="#EDB540"/>
      <stop offset="0.52" stop-color="#D0921E"/>
      <stop offset="1" stop-color="#7E5208"/>
    </linearGradient>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <filter id="frameDrop" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
    </filter>
'''

BEAD = "M-50 0 Q-49 -7 -39 -13 L-14 -25 Q0 -30 14 -25 L39 -13 Q49 -7 50 0 Q49 7 39 13 L14 25 Q0 30 -14 25 L-39 13 Q-49 7 -50 0 Z"


def bead(x, y, gold=False):
    fill = "url(#beadGold)" if gold else "url(#bead)"
    rim = "#6E4506" if gold else "#5E1D03"
    return (f'<g transform="translate({x:.1f} {y:.1f})">'
            f'<path d="{BEAD}" fill="{fill}" stroke="{rim}" stroke-opacity="0.45" stroke-width="2"/>'
            f'<path d="M-36 -11 L-13 -21 Q0 -25 10 -22" fill="none" stroke="#FFFFFF" stroke-opacity="{0.7 if gold else 0.55}" stroke-width="5" stroke-linecap="round"/>'
            f'<path d="M-46 0 Q0 -3 46 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>'
            '</g>')


def abacus():
    L, R = 214, 810          # outer edges of the posts
    PW = 44                  # post width
    TOP, BOT = 232, 772      # rail centre lines
    RH = 46                  # rail height
    ix0, ix1 = L + PW, R - PW
    iy0, iy1 = TOP + RH / 2, BOT - RH / 2
    out = ['<g filter="url(#frameDrop)">']
    out.append(f'<rect x="{ix0}" y="{iy0}" width="{ix1-ix0}" height="{iy1-iy0}" fill="url(#panel)"/>')
    # rods
    n = 5
    xs = [ix0 + (ix1 - ix0) * (k + 0.5) / n for k in range(n)]
    for x in xs:
        out.append(f'<rect x="{x-5:.1f}" y="{iy0}" width="10" height="{iy1-iy0}" fill="url(#rod)"/>')
    # rails
    for y in (TOP, BOT):
        out.append(f'<rect x="{L+10}" y="{y-RH/2}" width="{R-L-20}" height="{RH}" rx="8" fill="url(#railGold)"/>')
        out.append(f'<rect x="{L+14}" y="{y-RH/2+4}" width="{R-L-28}" height="3" rx="1.5" fill="#FFFBEA" opacity="0.7"/>')
    # posts with ball ends
    for x in (L, R - PW):
        out.append(f'<rect x="{x}" y="{TOP-34}" width="{PW}" height="{BOT-TOP+68}" rx="10" fill="url(#postGold)"/>')
        for y in (TOP - 40, BOT + 40):
            out.append(f'<circle cx="{x+PW/2}" cy="{y}" r="30" fill="url(#ballGold)"/>')
    out.append('</g>')
    # beads, climbing to the right; the top bead is gold
    counts = [1, 2, 3, 5, 7]
    step = 56
    out.append('<g filter="url(#drop)">')
    for x, c in zip(xs, counts):
        for i in range(c):
            y = iy1 - 28 - i * step
            out.append(bead(x, y, gold=(c == max(counts) and i == c - 1)))
    out.append('</g>')
    return "\n".join(out), BOT + 40 + 30  # bottom of the lower balls


def backdrop():
    random.seed(7)
    rays = []
    n = 28
    for i in range(n):
        ang = (i + 0.5) * 2 * math.pi / n + random.uniform(-0.05, 0.05)
        up = 0.5 - 0.5 * math.sin(ang)          # 1 pointing up, 0 pointing down
        w = random.uniform(0.02, 0.036)
        L = 780
        p1 = (CX + L * math.cos(ang - w), CY + L * math.sin(ang - w))
        p2 = (CX + L * math.cos(ang + w), CY + L * math.sin(ang + w))
        op = random.uniform(0.05, 0.1) + 0.06 * up
        rays.append(f'<path d="M{CX} {CY} L{p1[0]:.0f} {p1[1]:.0f} L{p2[0]:.0f} {p2[1]:.0f} Z" fill="#F1D594" opacity="{op:.2f}"/>')
    dust = []
    for i in range(24):
        x, y = random.uniform(60, 964), random.uniform(50, 740)
        r, op = random.uniform(2, 5.5), random.uniform(0.12, 0.34)
        blur = ' filter="url(#dustBlur)"' if r > 3.5 else ''
        dust.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="#E9E4F5" opacity="{op:.2f}"{blur}/>')
    return (f'<rect width="{W}" height="{W}" fill="url(#base)"/>\n'
            f'<g filter="url(#rayBlur)">{"".join(rays)}</g>\n'
            f'<rect width="{W}" height="{W}" fill="url(#glow)"/>\n'
            f'<g>{"".join(dust)}</g>\n')


ab, bottom = abacus()
S, DY = 0.86, -40
T = f"translate(512 512) scale({S}) translate(-512 -512) translate(0 {DY})"
floor_y = 512 + (bottom - 512 + DY) * S


def svg(view, body, bg=True):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="1024" height="1024">\n'
            f'<!-- Abacus Board: beads climb like a rising bar chart. Generated by make_icon.py. -->\n'
            f'<defs>{DEFS}  <mask id="reflMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">'
            f'<rect x="0" y="{floor_y:.0f}" width="1024" height="{1024-floor_y:.0f}" fill="url(#fade)"/></mask>\n</defs>\n'
            f'{body}</svg>\n')


reflection = (f'<g mask="url(#reflMask)"><g filter="url(#reflBlur)" transform="translate(0 {2*floor_y+4:.1f}) scale(1 -1)">'
              f'<g transform="{T}">{ab}</g></g></g>\n')
icon = svg("0 0 1024 1024",
           backdrop() + f'<rect x="0" y="{floor_y-6:.0f}" width="1024" height="{1030-floor_y:.0f}" fill="url(#floor)"/>\n' + reflection
           + f'<g transform="{T}">{ab}</g>\n')
open("icon.svg", "w").write(icon)
mark = svg("162 152 700 700", ab + "\n")
open("mark.svg", "w").write(mark)
open("adaptive.svg", "w").write(svg("-18 -28 1060 1060", ab + "\n"))
print("floor", round(floor_y))
