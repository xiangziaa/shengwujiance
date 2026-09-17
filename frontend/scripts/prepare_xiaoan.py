from pathlib import Path
import cv2
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=root.parent/'assets/source/xiaoan/standing.png'
output=root.parent/'output/xiaoan'
output.mkdir(parents=True,exist_ok=True)
im=np.array(Image.open(source).convert('RGB'))
# Conservative foreground seeds and a broad unknown band let GrabCut find the actual photographic edge.
points=np.array([(502,118),(450,121),(410,145),(381,185),(370,236),(385,302),(380,327),(400,367),(416,419),(440,447),(443,472),(420,503),(395,519),(290,550),(251,575),(235,620),(219,750),(202,920),(188,1100),(178,1337),(183,1365),(180,1384),(200,1431),(248,1473),(265,1490),(275,1535),(701,1535),(704,1500),(721,1472),(755,1446),(776,1417),(792,1372),(790,1338),(811,1336),(806,1170),(800,980),(788,814),(773,660),(755,588),(735,566),(646,534),(600,516),(580,501),(570,472),(575,447),(600,412),(612,372),(629,344),(630,319),(623,306),(637,253),(636,213),(620,168),(588,139),(548,123)],np.int32)
seed=np.zeros(im.shape[:2],np.uint8);cv2.fillPoly(seed,[points],255)
mask=np.full(seed.shape,cv2.GC_BGD,np.uint8)
mask[cv2.dilate(seed,np.ones((31,31),np.uint8))>0]=cv2.GC_PR_BGD
mask[seed>0]=cv2.GC_PR_FGD
mask[cv2.erode(seed,np.ones((25,25),np.uint8))>0]=cv2.GC_FGD
cv2.grabCut(cv2.cvtColor(im,cv2.COLOR_RGB2BGR),mask,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
a=np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
# Remove the outer contaminated pixel and lightly antialias, without a broad white feather.
a=cv2.erode(a,np.ones((3,3),np.uint8));a=cv2.GaussianBlur(a,(3,3),.5)
rgba=np.dstack([im,a]);rgba[a==0,:3]=0
Image.fromarray(rgba).save(root/'public/digital-human-standing-clean.webp',lossless=True)
# Rest and three modest lip apertures: deform the real lower lip, insert an internal slit, keep all surrounding face pixels fixed.
for n,amount in enumerate([0,2,4,6]):
    crop=im[389:436,463:550].copy();h,w=crop.shape[:2]
    yy,xx=np.mgrid[:h,:w].astype(np.float32)
    seam=17+2*np.maximum(0,1-((xx-44)/35)**2)
    influence=np.maximum(0,1-((xx-44)/34)**2)**1.5
    shift=amount*influence*np.maximum(0,1-np.abs(yy-seam)/19)
    sourceY=np.where(yy>=seam,yy-shift,yy)
    mouth=cv2.remap(crop,xx,sourceY,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    inside=(yy>=seam)&(yy<seam+amount*influence)
    mouth[inside]=np.array([91, 40,43],np.uint8)
    Image.fromarray(mouth).save(root/f'public/xiaoan-mouth-{n}.webp',lossless=True)
preview=np.full(im.shape, [12,50,93],np.uint8);alpha=a[:,:,None]/255
Image.fromarray((im*alpha+preview*(1-alpha)).astype(np.uint8)).resize((512,768)).save(output/'preview.png')
print('Generated alpha cutout and 4 mouth patches; transparent pixels:',int((a==0).sum()))
