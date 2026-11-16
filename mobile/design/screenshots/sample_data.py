import json, random, datetime as dt
random.seed(7)
T=1761800000000
def rec(i,**k): return dict(id=i,createdAt=T,updatedAt=T,**k)
items=[rec('i1',name='Candle Stall',groupId=None,status='Live',logo=None,iconText='CS',iconHue=28),
       rec('i2',name='Shift Planner',groupId=None,status='Live',logo=None,iconText='SP',iconHue=215),
       rec('i3',name='Word Quest',groupId=None,status='In development',logo=None,iconText='WQ',iconHue=150)]
P=[('p1','Soy Candle',25.20,'i1'),('p2','Gift Box',90,'i1'),('p3','Shift Planner Lifetime',19.99,'i2'),('p4','Shift Planner Premium',4.99,'i2'),('p5','Word Quest Hint Pack',2.99,'i3')]
products=[rec(a,name=b,price=c,itemId=d,groupId=None) for a,b,c,d in P]
price={a:c for a,b,c,d in P}; proj={a:d for a,b,c,d in P}
sales=[]; n=0
def sale(pid,date,ch,fee,q=1):
    global n; n+=1; sales.append(rec(f's{n}',productId=pid,customerId=None,quantity=q,discount=0,fee=fee,channel=ch,date=date))
d0=dt.date(2026,7,4)
while d0<=dt.date(2026,10,28):
    ds=d0.isoformat()
    if d0.weekday()==5:  # Saturday market
        for _ in range(random.randint(3,6)): sale('p1',ds,'In person',0)
        if random.random()<.6: sale('p2',ds,'In person',0)
    if random.random()<.18: sale('p1',ds,'Etsy',10)
    if random.random()<.3: sale('p3',ds,'App Store',15)
    if random.random()<.2: sale('p4',ds,'App Store',15)
    if random.random()<.1: sale('p5',ds,'App Store',15)
    d0+=dt.timedelta(days=1)
# make sure the hero Etsy/App Store sales are the latest
sale('p1','2026-10-29','Etsy',10); sale('p4','2026-10-29','App Store',15)
exps=[('e1',45,'Market stall fee','Marketing','Council','2026-10-17','i1'),('e2',92.75,'Jars and lids','Stock & materials','Candle Supply Co','2026-10-08','i1'),
      ('e3',38.50,'Gift box packaging','Stock & materials','PackRight','2026-10-01','i1'),('e4',186.40,'Soy wax and wicks','Stock & materials','Candle Supply Co','2026-08-12','i1'),
      ('e5',45,'Market stall fee','Marketing','Council','2026-09-19','i1'),('e6',45,'Market stall fee','Marketing','Council','2026-08-15','i1'),('e7',149,'Apple Developer Program','Developer accounts','Apple','2026-07-20','i2')]
expenses=[rec(a,amount=b,description=c,category=d,vendor=e,date=f,itemId=g,groupId=None) for a,b,c,d,e,f,g in exps]
recurring=[rec('r1',amount=30,description='AI tools subscription',category='AI tools',vendor='',frequency='monthly',startDate='2026-07-01',endDate=None,itemId='i2',groupId=None),
           rec('r2',amount=7,description='Web hosting',category='Hosting & domains',vendor='',frequency='monthly',startDate='2026-07-07',endDate=None,itemId='i2',groupId=None),
           rec('r3',amount=19,description='Domain and email',category='Hosting & domains',vendor='',frequency='yearly',startDate='2026-08-28',endDate=None,itemId='i2',groupId=None)]
settings=dict(currency='AUD',fyStartMonth=7,channels=[dict(name='In person',fee=0),dict(name='Etsy',fee=10),dict(name='Website',fee=3),dict(name='App Store',fee=15),dict(name='Google Play',fee=15)],
  categories=["Stock & materials","Software & subscriptions","AI tools","Hosting & domains","Developer accounts","Marketing","Shipping & postage","Equipment","Other"],updatedAt=T)
snap=dict(groups=[],items=items,products=products,customers=[],sales=sales,expenses=expenses,recurring=recurring,settings=settings,tombstones={})
json.dump(snap,open('snap.json','w'))
# figures for the cards
net=lambda s: price[s['productId']]*s['quantity']*(1-s['fee']/100)
octs=sum(net(s) for s in sales if s['date'].startswith('2026-10'))
def occ(r,until='2026-10-30'):
    out=[]; d=dt.date.fromisoformat(r['startDate'])
    while d.isoformat()<=until:
        out.append(d); 
        m=d.month+(1 if r['frequency']=='monthly' else 12); y=d.year+(m-1)//12; m=(m-1)%12+1; d=d.replace(year=y,month=m)
    return out
prof={}
for i in ['i1','i2','i3']:
    s=sum(net(x) for x in sales if proj[x['productId']]==i and x['date']>='2026-07-01')
    e=sum(x['amount'] for x in expenses if x['itemId']==i)+sum(r['amount']*len(occ(r)) for r in recurring if r['itemId']==i)
    prof[i]=s-e
print(json.dumps(dict(oct=round(octs,2),prof={k:round(v,2) for k,v in prof.items()},n=len(sales))))
