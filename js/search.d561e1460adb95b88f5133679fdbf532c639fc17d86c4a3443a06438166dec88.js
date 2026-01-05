(()=>{var g=null;async function k(){try{g=await(await fetch("/index.json")).json(),console.log("\u641C\u7D22\u6570\u636E\u5DF2\u52A0\u8F7D\uFF0C\u5171",g.length,"\u6761\u8BB0\u5F55"),console.log("\u793A\u4F8B\u6570\u636E:",g.slice(0,2))}catch(r){console.error("\u641C\u7D22\u6570\u636E\u52A0\u8F7D\u5931\u8D25:",r)}}function m(r){if(!g||!r.trim())return[];let o=r.toLowerCase().split(/\s+/).filter(e=>e.length>0);return g.map(e=>{let t=0,s=[],n={title:e.title||"",content:e.content||"",summary:e.summary||"",description:e.description||"",tags:Array.isArray(e.tags)?e.tags.join(" "):"",categories:Array.isArray(e.categories)?e.categories.join(" "):""},i={title:5,tags:4,summary:3,description:3,categories:2,content:1};return o.forEach(d=>{Object.entries(n).forEach(([c,f])=>{let u=f.toLowerCase();if(u.includes(d)){let w=u===d,v=u.split(/\s+/).includes(d),h=i[c];w?h*=3:v&&(h*=2),c==="title"&&u.startsWith(d)&&(h*=1.5),t+=h,s.includes(c)||s.push(c)}})}),s.length>1&&(t*=1+s.length*.1),o.every(d=>Object.values(n).some(c=>c.toLowerCase().includes(d)))&&(t*=1.2),{...e,score:t,matchedFields:s}}).filter(e=>e.score>0).sort((e,t)=>t.score-e.score)}function y(r,a){if(!r||!a)return r;let o=a.toLowerCase().split(/\s+/).filter(e=>e.length>0),l=r;return o.forEach(e=>{let t=new RegExp(`(${e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");l=l.replace(t,'<mark style="background: linear-gradient(120deg, #ffd700 0%, #ffed4a 100%); color: #2d3748; padding: 1px 2px; border-radius: 3px; font-weight: 600;">$1</mark>')}),l}function $(r,a,o=150){if(!r||!a)return r.substring(0,o)+"...";let l=a.toLowerCase().split(/\s+/).filter(i=>i.length>0),e="",t=0,s=r.toLowerCase(),n=r.split(/\s+/);for(let i=0;i<n.length-20;i++){let p=n.slice(i,i+25).join(" "),d=p.toLowerCase(),c=l.filter(f=>d.includes(f)).length;c>t&&(t=c,e=p)}return e||(e=r.substring(0,o)),e.length>o&&(e=e.substring(0,o)+"..."),y(e,a)}function x(r,a){let o=document.getElementById("search-results");if(o||(o=document.createElement("div"),o.id="search-results",o.style.cssText=`
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 12px;
            max-height: 384px;
            overflow-y: auto;
            z-index: 999;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            border: 2px solid #e6edff;
            backdrop-filter: blur(10px);
            display: none;
        `,document.getElementById("search-bar").appendChild(o)),r.length===0){let s=["\u89C6\u594F","\u97F3\u4E50","\u5409\u4ED6","IC Studio","\u6559\u5B66"].sort(()=>.5-Math.random()).slice(0,3);o.innerHTML=`
            <div style="padding: 28px; text-align: center; color: #718096; font-size: 14px;">
                <div style="font-size: 42px; margin-bottom: 16px; opacity: 0.6;">\u{1F50D}</div>
                <div style="font-weight: 600; margin-bottom: 8px; color: #4a5568; font-size: 16px;">\u672A\u627E\u5230 "${y(a,a)}" \u76F8\u5173\u5185\u5BB9</div>
                <div style="opacity: 0.8; margin-bottom: 16px;">\u8BD5\u8BD5\u4EE5\u4E0B\u641C\u7D22\u5EFA\u8BAE\uFF1A</div>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    ${s.map(n=>`<span style="background: #e6edff; color: #667eea; padding: 4px 8px; border-radius: 12px; font-size: 12px; cursor: pointer;" onclick="document.querySelector('#search input').value='${n}'; document.querySelector('#search input').dispatchEvent(new Event('input'));">${n}</span>`).join("")}
                </div>
            </div>
        `,o.style.display="block";return}let l=r.slice(0,8).map((t,s)=>{let n=Array.isArray(t.tags)&&t.tags.length>0?t.tags.slice(0,3).map(f=>`<span style="background: #e6edff; color: #667eea; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 4px;">${y(f,a)}</span>`).join(""):"",i=y(t.title,a),p=$(t.content||t.summary||"",a,140),d=t.matchedFields&&t.matchedFields.length>0?`<span style="font-size: 10px; color: #a0aec0;">\u5339\u914D: ${t.matchedFields.join(", ")}</span>`:"",c=t.score?`<span style="font-size: 10px; color: #cbd5e0; margin-left: 8px;">\u8BC4\u5206: ${Math.round(t.score)}</span>`:"";return`
        <a href="${t.href}"
           style="
               display: block;
               padding: 16px 20px;
               text-decoration: none;
               transition: all 0.3s ease;
               border-bottom: ${s===r.slice(0,8).length-1?"none":"1px solid rgba(230, 237, 255, 0.5)"};
           "
           onmouseover="this.style.background='linear-gradient(135deg, #f0f4ff 0%, #e6edff 100%)'; this.style.transform='translateY(-1px)'"
           onmouseout="this.style.background='transparent'; this.style.transform='translateY(0)'">
            <div style="
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 6px;
                font-size: 15px;
                line-height: 1.4;
            ">${i}</div>
            <div style="
                font-size: 12px;
                color: #667eea;
                margin-bottom: 8px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <span style="text-transform: uppercase; letter-spacing: 0.5px;">${t.type||"\u6587\u7AE0"} \u2022 ${t.date||"\u6700\u8FD1"}</span>
                <span>${d}${c}</span>
            </div>
            ${n?`<div style="margin-bottom: 8px;">${n}</div>`:""}
            <div style="
                font-size: 13px;
                color: #718096;
                line-height: 1.5;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            ">${p}</div>
        </a>
        `}).join(""),e=`
        <div style="
            padding: 12px 20px;
            background: linear-gradient(135deg, #f8f9ff 0%, #e6edff 100%);
            border-bottom: 1px solid rgba(230, 237, 255, 0.8);
            font-size: 12px;
            color: #667eea;
            font-weight: 500;
        ">
            \u627E\u5230 <strong>${r.length}</strong> \u4E2A\u76F8\u5173\u7ED3\u679C\uFF0C\u641C\u7D22\u7528\u65F6 <strong>${Date.now()-(window.searchStartTime||Date.now())}ms</strong>
        </div>
    `;o.innerHTML=e+l,o.style.display="block"}function b(){let r=document.getElementById("search-results");r&&(r.style.display="none",r.querySelectorAll("a").forEach(o=>{o.dataset.selected="false",o.style.background="transparent",o.style.transform="translateY(0)"}))}function E(){let r=document.getElementById("search"),a=r.querySelector('input[type="text"]'),o=r.querySelector("button");a.placeholder="\u641C\u7D22\u6587\u7AE0\u5185\u5BB9...";let l;a.addEventListener("input",e=>{clearTimeout(l);let t=e.target.value.trim();if(t.length<2){b();return}l=setTimeout(()=>{window.searchStartTime=Date.now();let s=m(t);x(s,t)},300)}),r.addEventListener("submit",e=>{e.preventDefault();let t=a.value.trim();if(t.length>=2){window.searchStartTime=Date.now();let s=m(t);x(s,t)}}),document.addEventListener("click",e=>{document.getElementById("search-bar").contains(e.target)||b()}),a.addEventListener("keydown",e=>{let t=document.getElementById("search-results");if(!t||t.style.display==="none")return;let s=t.querySelectorAll("a"),n=Array.from(s).findIndex(i=>i.dataset.selected==="true");e.key==="ArrowDown"?(e.preventDefault(),n>=0&&(s[n].dataset.selected="false",s[n].style.background="transparent",s[n].style.transform="translateY(0)"),n=(n+1)%s.length,s[n].dataset.selected="true",s[n].style.background="linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)",s[n].style.transform="translateY(-1px)"):e.key==="ArrowUp"?(e.preventDefault(),n>=0&&(s[n].dataset.selected="false",s[n].style.background="transparent",s[n].style.transform="translateY(0)"),n=n<=0?s.length-1:n-1,s[n].dataset.selected="true",s[n].style.background="linear-gradient(135deg, #e6edff 0%, #d4e6ff 100%)",s[n].style.transform="translateY(-1px)"):e.key==="Enter"&&n>=0&&(e.preventDefault(),s[n].click())})}document.addEventListener("DOMContentLoaded",()=>{k(),E()});})();
