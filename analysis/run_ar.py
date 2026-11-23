import sys; sys.path.insert(0,'/home/user/Nguyen-Thanh/analysis')
from ar_model import *
asof = dt.date(2026,11,12)
kh, inv, openbal, rec, by, obs = build(asof)
print('hóa đơn',len(inv),'khách',len(by),'quan sát',len(obs),'đã trả',sum(1 for o in obs if o[2]))
op=[i for i in inv if i['rem']>1]; print('mở',len(op),sum(i['rem'] for i in op)/1e9,'thiếu hạn',sum(1 for i in op if i['due_missing']), sum(i['rem'] for i in op if i['due_missing'])/1e9)
import statistics
paid=[o for o in obs if o[2]]
w=[(o[1],o[3]) for o in paid]
tot=sum(x[1] for x in w)
for lo,hi in [(-99,0),(1,7),(8,15),(16,30),(31,60),(61,999)]:
    print(f'trả trễ {lo}..{hi}: {sum(a for d,a in w if lo<=d<=hi)/tot:.1%}')
S=km([(o[1],o[2],o[3]) for o in obs])
for t in (-10,0,7,15,30,45,60,90,120,180,300): print('S',t,round(S[t],3))
# số ngày từ HĐ đến thu
print('median ngày HĐ→thu',statistics.median([o[4] for o in paid]))
