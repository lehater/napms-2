import { chromium } from '/tmp/napms-ui-baseline/web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
const [label,port]=process.argv.slice(2); const out=new URL(`./${label}/`,import.meta.url); await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(); const measurements=[];
for(const [width,height] of [[1440,900],[1920,1080],[390,844]]) for(const [tab,query] of [['overview',''],['components','?tab=components'],['communications','?tab=interactions']]) {
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}); await page.goto(`http://127.0.0.1:${port}/prototype/applications/mock-application${query}`); await page.waitForLoadState('networkidle');
 await page.screenshot({path:new URL(`${width}x${height}-${tab}.png`,out).pathname,fullPage:true});
 const geometry=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0).map(e=>({tag:e.tagName,class:e.className,client:e.clientWidth,scroll:e.scrollWidth})),headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent)}));
 const keyboard=[]; for(let i=0;i<24;i++){await page.keyboard.press('Tab');keyboard.push(await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,100),href:e.getAttribute('href'),outline:s.outline,boxShadow:s.boxShadow,visible:r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight}}));}
 measurements.push({width,height,tab,geometry,keyboard}); await page.close();
} await fs.writeFile(new URL('measurements.json',out),JSON.stringify(measurements,null,2)); await browser.close();
