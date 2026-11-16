import json, sys
from playwright.sync_api import sync_playwright
snap=open('snap.json').read(); OUT='caps'
import os; os.makedirs(OUT,exist_ok=True)
def go(p,scheme,name,steps):
    ctx=p.new_context(viewport={'width':393,'height':798},device_scale_factor=3,color_scheme=scheme)
    pg=ctx.new_page()
    pg.add_init_script("localStorage.setItem('profitPocket.data',%s);" % json.dumps(snap))
    pg.goto('http://localhost:8091/'); pg.wait_for_timeout(3500)
    steps(pg); pg.wait_for_timeout(1000)
    pg.screenshot(path=f'{OUT}/{name}.png'); ctx.close()
def tab(n): return lambda pg: (pg.get_by_role('tab',name=n).first.click() if pg.get_by_role('tab',name=n).count() else pg.get_by_text(n,exact=True).last.click(), pg.wait_for_timeout(800))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    go(b,'light','light-home',lambda pg:None)
    go(b,'light','light-sales',tab('Sales'))
    go(b,'dark','dark-expenses',tab('Expenses'))
    def proj(pg):
        pg.get_by_text('Candle Stall',exact=True).first.click(force=True); pg.wait_for_timeout(1000)
        pg.get_by_text('Financial year',exact=True).last.click(force=True)
    go(b,'light','light-project',proj)
    def tax(pg):
        pg.get_by_label('Settings').first.click() if pg.get_by_label('Settings').count() else None
        pg.wait_for_timeout(1000); pg.get_by_text('Tax Reports',exact=True).first.click(force=True)
    go(b,'light','light-tax',tax)
    b.close()
print('ok')
