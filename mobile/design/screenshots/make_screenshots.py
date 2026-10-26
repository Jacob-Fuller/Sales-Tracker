# Builds the six App Store screenshots (1290 x 2796) from captured app screens.
# Usage: python3 make_screenshots.py <captures dir> <out dir>
# Captures: light-home, light-sales, light-project, light-tax, dark-expenses
# (393 x 798 points at 3x, no status bar) and taxpage.png (report page).
import base64, math, random, sys
from playwright.sync_api import sync_playwright

CAP, OUT = sys.argv[1], sys.argv[2]
W, H = 1290, 2796
ICON = sys.argv[3] if len(sys.argv) > 3 else None


def uri(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()


def backdrop(w, h, cx, cy, seed):
    random.seed(seed)
    rays = []
    n = 34
    for i in range(n):
        a = (i + 0.5) * 2 * math.pi / n + random.uniform(-0.04, 0.04)
        up = 0.5 - 0.5 * math.sin(a)
        wd = random.uniform(0.016, 0.03)
        L = 4200
        p1 = (cx + L * math.cos(a - wd), cy + L * math.sin(a - wd))
        p2 = (cx + L * math.cos(a + wd), cy + L * math.sin(a + wd))
        rays.append(f'<path d="M{cx} {cy} L{p1[0]:.0f} {p1[1]:.0f} L{p2[0]:.0f} {p2[1]:.0f} Z" fill="#F1D594" opacity="{random.uniform(0.04, 0.08) + 0.05 * up:.3f}"/>')
    dust = "".join(
        f'<circle cx="{random.uniform(0, w):.0f}" cy="{random.uniform(0, h):.0f}" r="{random.uniform(3, 8):.1f}" fill="#E9E4F5" opacity="{random.uniform(0.1, 0.3):.2f}"'
        + (' filter="url(#db)"' if random.random() < 0.5 else "") + "/>" for _ in range(int(w * h / 90000)))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="position:absolute;inset:0">
<defs>
<radialGradient id="base" cx="{cx/w}" cy="{cy/h}" r="1.05"><stop offset="0" stop-color="#3A3955"/><stop offset="0.4" stop-color="#20213A"/><stop offset="1" stop-color="#0E0F1F"/></radialGradient>
<radialGradient id="glow" cx="{cx}" cy="{cy}" r="{w*0.9:.0f}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E8C77E" stop-opacity="0.32"/><stop offset="0.45" stop-color="#C9A35A" stop-opacity="0.08"/><stop offset="1" stop-color="#C9A35A" stop-opacity="0"/></radialGradient>
<filter id="rb"><feGaussianBlur stdDeviation="14"/></filter><filter id="db"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<rect width="{w}" height="{h}" fill="url(#base)"/><g filter="url(#rb)">{"".join(rays)}</g><rect width="{w}" height="{h}" fill="url(#glow)"/>{dust}</svg>'''


STATUS = '''<div class="sb" style="color:{fg}"><span>9:41</span><span class="ic">
<svg width="54" height="34" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg width="48" height="34" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.5 6.9a6.4 6.4 0 0 1 9 0l-1.4 1.4a4.4 4.4 0 0 0-6.2 0zM1.2 4.6a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0z" fill="currentColor"/></svg>
<svg width="80" height="36" viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="19" height="8" rx="2.2" fill="currentColor"/><path d="M24 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity="0.45"/></svg>
</span></div>'''


def phone(shot, width, x, y, rot=0, dark=False, z=1):
    # Screen is 393 x 852 points; the capture fills it below a 54pt status bar.
    k = width / 433.0
    bg = "#000" if dark else "#F2F2F7"
    fg = "#fff" if dark else "#000"
    return f'''<div class="phone" style="left:{x}px;top:{y}px;width:433px;height:892px;transform:scale({k:.4f}) rotate({rot}deg);z-index:{z}">
<div class="screen" style="background:{bg}">{STATUS.format(fg=fg)}<img src="{uri(f"{CAP}/{shot}.png")}" style="position:absolute;left:0;top:54px;width:393px;height:798px"/>
<div class="island"></div><div class="home" style="background:{fg}"></div></div></div>'''


def card(html, x, y, w, rot=0, z=5, dark=False):
    bg = "#2C2C2E;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 3px rgba(233,196,106,.55)" if dark else "#FFFFFF"
    return f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;transform:rotate({rot}deg);z-index:{z};background:{bg}">{html}</div>'


def row(title, sub, amount, tone="", dark=False):
    color = {"gain": "#30D158" if dark else "#248A3D", "loss": "#D70015"}.get(tone, "#fff" if dark else "#000")
    return (f'<div class="row"><div><div class="t">{title}</div><div class="s">{sub}</div></div>'
            f'<div class="a" style="color:{color}">{amount}</div></div>')


CSS = '''
*{box-sizing:border-box;margin:0;padding:0}
body{width:%dpx;height:2796px;position:relative;overflow:hidden;font-family:"Inter Display","Inter",sans-serif;background:#111}
.head{position:absolute;left:110px;right:110px;top:230px;z-index:10}
.eyebrow{font-family:"Inter";font-weight:700;font-size:40px;letter-spacing:9px;color:#E9C46A;text-transform:uppercase;margin-bottom:34px}
h1{font-weight:800;font-size:132px;line-height:1.02;letter-spacing:-3px;color:#fff}
h1 em{font-style:normal;background:linear-gradient(180deg,#FFE7A6,#E9B44C 60%%,#C98A1E);-webkit-background-clip:text;color:transparent}
.phone{position:absolute;transform-origin:0 0;border-radius:68px;background:linear-gradient(145deg,#4a4a52,#18181c 40%%,#2c2c32);padding:20px;
 box-shadow:0 80px 140px rgba(0,0,0,.55),0 0 0 2px #5a5a62 inset,0 0 120px rgba(233,196,106,.18)}
.screen{position:relative;width:393px;height:852px;border-radius:50px;overflow:hidden}
.sb{position:absolute;left:0;right:0;top:0;height:54px;display:flex;justify-content:space-between;align-items:center;padding:4px 30px 0 46px;font:600 17px "Inter";z-index:3}
.sb .ic{display:flex;gap:6px;align-items:center}.sb .ic svg{width:auto;height:12px}
.island{position:absolute;top:11px;left:50%%;margin-left:-62px;width:124px;height:36px;border-radius:20px;background:#000;z-index:4}
.home{position:absolute;bottom:8px;left:50%%;margin-left:-70px;width:140px;height:5px;border-radius:3px;z-index:4;opacity:.9}
.card{position:absolute;border-radius:40px;padding:34px 44px;box-shadow:0 40px 90px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
.row{display:flex;align-items:center;justify-content:space-between;gap:30px;font-family:"Inter"}
.row .t{font-size:46px;font-weight:600;color:#000}.row .s{font-size:34px;color:#6C6C70;margin-top:6px}
.row .a{font-size:50px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.row+.row{border-top:2px solid #E5E5EA;margin-top:24px;padding-top:24px}
.dk .t{color:#fff}.dk .s{color:#98989F}.dk .row+.row{border-color:#38383A}
.paper{position:absolute;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 60px 120px rgba(0,0,0,.5)}
.tile{position:absolute;border-radius:22.4%%;box-shadow:0 30px 70px rgba(0,0,0,.5);overflow:hidden}
'''


def page(width, body):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS % width}</style></head><body>{body}</body></html>'


def head(eyebrow, title, top=230, left=110, width=None):
    w = f"width:{width}px;right:auto;" if width else ""
    return f'<div class="head" style="top:{top}px;left:{left}px;{w}"><div class="eyebrow">{eyebrow}</div><h1>{title}</h1></div>'


slides = {}

# 1 + 2: one tilted phone across both
pano = backdrop(2 * W, H, 1290, 1250, 1)
icon = f'<img class="tile" src="{uri(ICON)}" style="left:110px;top:150px;width:200px;height:200px"/>' if ICON else ""
body12 = pano + icon
body12 += head("Abacus Board", "Know what you <em>really</em> make.", top=420, width=1070)
body12 += head("Fees counted", "Store cuts taken off. <em>Every sale.</em>", left=W + 110, top=230, width=1070)
body12 += phone("light-home", 1010, 790, 1180, rot=-9, z=2)
body12 += card(row("Soy Candle", "Etsy · 10% fee taken off", "+$22.68", "gain"), W + 330, 1020, 860, rot=3, z=6)
body12 += card(row("Shift Planner Premium", "App Store · 15% fee taken off", "+$4.24", "gain"), W + 420, 1520, 780, rot=-2, z=6)
slides["12"] = page(2 * W, body12)

# 3: sales
b3 = backdrop(W, H, 645, 1500, 3) + head("Sales", "Every sale, <em>month by month.</em>")
b3 += phone("light-sales", 1000, 190, 1000, rot=3)
b3 += card(row("October 2026", "Sales after fees", "$1,279.62", "gain"), 70, 1560, 820, rot=-3, z=6)
slides["03"] = page(W, b3)

# 4: repeating costs, in dark mode
b4 = backdrop(W, H, 645, 1500, 4) + head("Expenses", "Subscriptions, <em>counted on the day.</em>")
b4 += phone("dark-expenses", 1000, 210, 1010, rot=4, dark=True)
b4 += card(f'<div class="dk">{row("Repeating", "3 subscriptions", "$38.58 a month", dark=True)}</div>', 60, 1980, 860, rot=-4, z=6, dark=True)
slides["04"] = page(W, b4)

# 5: projects
b5 = backdrop(W, H, 645, 1500, 5) + head("Projects", "Profit for <em>every</em> project.")
b5 += phone("light-project", 1000, 230, 1040, rot=-3)
b5 += card(row("Candle Stall", "This financial year", "$3,780.57") + row("Shift Planner", "This financial year", "$492.23") + row("Word Quest", "This financial year", "$88.95"),
           60, 1960, 900, rot=2, z=6)
slides["05"] = page(W, b5)

# 6: tax reports
b6 = backdrop(W, H, 645, 1500, 6) + head("Tax time", "A tax report <em>in one tap.</em>")
b6 += f'<div class="paper" style="left:440px;top:930px;width:760px;height:1075px;transform:rotate(6deg);z-index:1"><img src="{uri(f"{CAP}/taxpage.png")}" style="width:760px"/></div>'
b6 += phone("light-tax", 880, 60, 1400, rot=-5, z=3)
slides["06"] = page(W, b6)

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, html in slides.items():
        w = 2 * W if name == "12" else W
        pg = b.new_page(viewport={"width": w, "height": H})
        pg.set_content(html)
        pg.wait_for_timeout(600)
        if name == "12":
            pg.screenshot(path=f"{OUT}/01.png", clip={"x": 0, "y": 0, "width": W, "height": H})
            pg.screenshot(path=f"{OUT}/02.png", clip={"x": W, "y": 0, "width": W, "height": H})
        else:
            pg.screenshot(path=f"{OUT}/{name}.png")
        pg.close()
    b.close()
print("done")
