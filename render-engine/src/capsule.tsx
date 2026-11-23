import React from "react";
import {
  AbsoluteFill,Audio,Img,OffthreadVideo,
  interpolate,spring,staticFile,useCurrentFrame,useVideoConfig,
} from "remotion";

export type HdFormat="16:9"|"9:16"|"1:1";
export type HdStyle="journalist"|"rafale"|"quote"|"editorial"|"classic";
export type HdCapsuleProps={
  schemaVersion:1; projectId:string;capsuleId:string;title:string;
  start:number;end:number;format:HdFormat;style:HdStyle;
  caption:string;bubble:string;
  journalistName:string;journalistOutlet:string;
  questionAttribution:"verified"|"reconstructed";
  masterAsset:string;foregroundAsset:string;audioAsset:string;
  backgroundAsset:string;portraitAsset:string;
  episodeLabel:string;
};

export const sampleProps:HdCapsuleProps={
  schemaVersion:1,projectId:"sample",capsuleId:"sample",title:"La réponse",
  start:0,end:30,format:"16:9",style:"journalist",
  caption:"Ce n'est pas un manque d'intérêt, c'est une question de confiance.",
  bubble:"Pourquoi remet-on ce modèle en question?",
  journalistName:"",journalistOutlet:"",
  questionAttribution:"reconstructed",
  masterAsset:"master.mp4",foregroundAsset:"",audioAsset:"",
  backgroundAsset:"",portraitAsset:"",episodeLabel:"ÉP. 01",
};

export function dimensionsFor(format:HdFormat){
  return format==="9:16"?{width:1080,height:1920}:
    format==="1:1"?{width:1080,height:1080}:{width:1920,height:1080};
}
const lime="#CCFF00";
const font="'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const upper=(v:string)=>v.toLocaleUpperCase("fr-CA");
const titleSize=(value:string,base:number,minimum:number)=>
  Math.max(minimum,base-(Math.max(0,value.length-45)*0.48));
const safe=(name:string)=>Boolean(name)&&/^[a-zA-Z0-9_.-]{1,120}$/.test(name);

function Microphone({size}:{size:number}){
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect x="13" y="5" width="10" height="18" rx="5" stroke="currentColor" strokeWidth="2.6"/>
    <path d="M8 17c0 6 4 10 10 10s10-4 10-10M18 27v5m-7 0h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
  </svg>;
}

function WordMark({vertical,episode}:{vertical:boolean;episode:string}){
  return <div style={{display:"flex",alignItems:"center",gap:vertical?15:23}}>
    <div style={{fontFamily:font,fontWeight:950,color:"#fff",fontSize:vertical?34:35,lineHeight:.83,
      textTransform:"uppercase",letterSpacing:"-.035em"}}>DOMINIQUE<br/>SOUCY</div>
    <div style={{height:55,width:8,background:lime,transform:"skewX(-21deg)"}}/>
    <div style={{fontFamily:font,fontSize:vertical?23:24,color:"#fff",fontStyle:"italic",fontWeight:850,
      lineHeight:1.05}}>LA CONFÉRENCE<br/>DE PRESSE LIVE</div>
    {!vertical&&<div style={{marginLeft:18,fontFamily:font,fontWeight:900,fontSize:24,
      color:"#fff",letterSpacing:2}}>{episode}</div>}
  </div>;
}

function GlowPanel({children,vertical,style}:{children:React.ReactNode;vertical:boolean;style?:React.CSSProperties}){
  return <div style={{
    position:"relative",borderRadius:vertical?28:36,
    background:"linear-gradient(135deg,rgba(23,23,25,.90),rgba(5,5,6,.87))",
    border:"2px solid rgba(238,255,226,.72)",
    boxShadow:"inset -2px -2px 0 rgba(204,255,0,.45), 0 12px 60px rgba(0,0,0,.56), 5px 9px 29px rgba(204,255,0,.28)",
    padding:vertical?34:44,boxSizing:"border-box",overflow:"hidden",...style,
  }}>
    <div style={{position:"absolute",pointerEvents:"none",bottom:0,right:0,height:4,width:"82%",
      background:"linear-gradient(90deg,transparent,#CCFF00)",filter:"blur(1px)",
      boxShadow:"0 0 22px #CCFF00"}}/>
    {children}
  </div>;
}

function PresenterMedia({props,vertical}:{props:HdCapsuleProps;vertical:boolean}){
  const fps=30;
  const trimBefore=Math.max(0,Math.round(props.start*fps));
  const durationInFrames=Math.max(1,Math.round((props.end-props.start)*fps));
  const containsForeground=safe(props.foregroundAsset);
  return <>
    <AbsoluteFill style={{background:"radial-gradient(circle at 60% 25%,#30312d 0%,#0a0a0a 72%)"}}>
      {containsForeground&&safe(props.backgroundAsset)?<Img src={staticFile(props.backgroundAsset)} style={{
        width:"100%",height:"100%",objectFit:"cover"}}/>:
        <div style={{position:"absolute",inset:0,opacity:.55,
          background:"repeating-linear-gradient(124deg,transparent 0px,transparent 420px,rgba(204,255,0,.08) 430px,transparent 460px)"}}/>}
    </AbsoluteFill>
    {containsForeground?
      <>
        <AbsoluteFill style={{overflow:"hidden",display:"flex",justifyContent:vertical?"center":"flex-start",
          alignItems:"center"}}>
          <OffthreadVideo src={staticFile(props.foregroundAsset)}
            trimBefore={trimBefore} durationInFrames={durationInFrames} transparent muted
            style={{height:vertical?"75%":"115%",width:vertical?"100%":"68%",objectFit:"contain",
              objectPosition:"center center",transform:vertical?"translateY(-12%)":"translateX(-1%)"}}/>
        </AbsoluteFill>
        <Audio src={staticFile(safe(props.audioAsset)?props.audioAsset:"audio.wav")}
          trimBefore={trimBefore} volume={1}/>
      </>:
      <AbsoluteFill style={{overflow:"hidden"}}>
        <OffthreadVideo src={staticFile(props.masterAsset)}
          trimBefore={trimBefore} durationInFrames={durationInFrames} volume={1}
          style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
      </AbsoluteFill>
    }
    <AbsoluteFill style={{pointerEvents:"none",background:vertical?
      "linear-gradient(180deg,transparent 39%,rgba(0,0,0,.2) 57%,rgba(0,0,0,.94) 86%)":
      "linear-gradient(90deg,rgba(0,0,0,.06) 0%,rgba(0,0,0,.08) 41%,rgba(0,0,0,.80) 68%,rgba(0,0,0,.86) 100%)"}}/>
  </>;
}

function QuestionCard({props,vertical,frame,small=false}:{props:HdCapsuleProps;vertical:boolean;frame:number;small?:boolean}){
  const reveal=spring({frame:frame-(small?10:14),fps:30,config:{damping:17,stiffness:95}});
  const reconstructed=props.questionAttribution==="reconstructed";
  const attribution=props.journalistName.trim()|| (reconstructed?"QUESTION PROPOSÉE PAR IA":"JOURNALISTE");
  const title=props.bubble.trim()||props.title;
  return <GlowPanel vertical={vertical} style={{
    opacity:interpolate(reveal,[0,1],[0,1]),
    transform:`translateY(${interpolate(reveal,[0,1],[50,0])}px) rotate(-1deg)`,
    width:"100%",minHeight:small?110:vertical?260:360,
  }}>
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:vertical?18:24}}>
      <div style={{width:small?42:vertical?58:62,height:small?42:vertical?58:62,
        borderRadius:"50%",background:"#141516",border:`3px solid ${lime}`,
        color:lime,display:"grid",placeItems:"center"}}>
        <Microphone size={small?25:34}/>
      </div>
      <div style={{background:lime,transform:"skewX(-12deg)",padding:small?"5px 12px":"8px 22px"}}>
        <span style={{display:"block",transform:"skewX(12deg)",color:"#090909",fontFamily:font,
          fontWeight:950,fontStyle:"italic",fontSize:small?25:vertical?36:40}}>
          {reconstructed?"QUESTION RECONSTRUITE":"QUESTION — JOURNALISTE"}
        </span>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:20}}>
      {safe(props.portraitAsset)&&<Img src={staticFile(props.portraitAsset)}
        style={{width:vertical?105:140,height:vertical?105:140,objectFit:"cover",
          borderRadius:18,filter:"grayscale(.35)"}}/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:font,fontSize:vertical?24:small?19:27,
          color:"#e9e9e9",fontStyle:"italic",marginBottom:10}}>
          {attribution}{props.journalistOutlet?` · ${props.journalistOutlet}`:""}
        </div>
        <div style={{fontFamily:font,fontWeight:900,fontStyle:"italic",color:"#fff",
          fontSize:small?32:vertical?49:titleSize(title,67,38),lineHeight:.99,
          overflowWrap:"anywhere",textShadow:"0 2px 8px #000"}}>
          « {title.slice(0,230)} »
        </div>
      </div>
    </div>
    {reconstructed&&<div style={{fontFamily:font,fontSize:vertical?19:21,color:"#c8c8c8",
      marginTop:16,letterSpacing:1.1}}>
      RECONSTITUTION ÉDITORIALE — PAS UNE QUESTION ENREGISTRÉE
    </div>}
  </GlowPanel>;
}

function QuoteCard({props,vertical,frame}:{props:HdCapsuleProps;vertical:boolean;frame:number}){
  const motion=spring({frame:frame-8,fps:30,config:{damping:19,stiffness:105}});
  const caption=props.caption.trim()||props.title;
  return <GlowPanel vertical={vertical} style={{
    width:"100%",transform:`translateY(${interpolate(motion,[0,1],[85,0])}px)`,
    opacity:motion,
  }}>
    <div style={{background:lime,width:"fit-content",padding:"7px 20px",
      transform:"skewX(-12deg)",marginBottom:22}}>
      <span style={{transform:"skewX(12deg)",display:"block",fontFamily:font,fontSize:vertical?35:39,
        fontStyle:"italic",fontWeight:950,color:"#070707"}}>LA RÉPONSE</span>
    </div>
    <div style={{fontFamily:font,fontSize:vertical?58:titleSize(caption,83,48),
      fontWeight:900,fontStyle:"italic",lineHeight:.97,overflowWrap:"anywhere",
      color:"white",textShadow:"0 2px 6px #000"}}>
      « {caption.slice(0,250)} »
    </div>
  </GlowPanel>;
}

function RafaleCard({props,vertical,frame}:{props:HdCapsuleProps;vertical:boolean;frame:number}){
  const questions=props.bubble.split("\n").map(v=>v.trim()).filter(Boolean).slice(0,3);
  const cards=questions.length?questions:[props.bubble||props.title];
  return <div style={{display:"grid",gap:vertical?20:16}}>
    {cards.map((q,i)=>{
      const reveal=spring({frame:frame-8-i*14,fps:30,config:{damping:18,stiffness:110}});
      return <GlowPanel vertical={vertical} key={i} style={{
        opacity:reveal,transform:`translateX(${interpolate(reveal,[0,1],[80,0])}px)`,
        padding:vertical?26:22,
      }}>
        <div style={{display:"flex",gap:18,alignItems:"flex-start"}}>
          <strong style={{fontFamily:font,fontSize:vertical?44:46,color:"#070707",
            background:lime,padding:"4px 14px",fontStyle:"italic"}}>{String(i+1).padStart(2,"0")}</strong>
          <div style={{fontFamily:font,fontSize:vertical?39:40,lineHeight:1.04,
            fontWeight:900,fontStyle:"italic",color:"white"}}>{q.slice(0,130)}</div>
        </div>
      </GlowPanel>;
    })}
  </div>;
}

export const Capsule:React.FC<HdCapsuleProps>=(props)=>{
  const frame=useCurrentFrame();
  const {width,height}=useVideoConfig();
  const vertical=props.format==="9:16";
  const square=props.format==="1:1";
  const showQuestion=props.style==="journalist"||props.style==="classic";
  const showRafale=props.style==="rafale";
  const pad=vertical?55:square?42:68;
  const cardWidth=vertical?"100%":square?"53%":"49%";
  return <AbsoluteFill style={{background:"#080809",color:"#fff"}}>
    <PresenterMedia props={props} vertical={vertical}/>
    <AbsoluteFill style={{padding:pad,pointerEvents:"none",
      boxSizing:"border-box",justifyContent:"space-between"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
        <WordMark vertical={vertical} episode={props.episodeLabel}/>
        <div style={{background:"rgba(0,0,0,.77)",border:`2px solid ${lime}`,
          borderRadius:28,color:lime,padding:"10px 19px",fontFamily:font,fontSize:vertical?23:27,
          fontWeight:900,fontStyle:"italic",letterSpacing:1.5}}>
          ● EN DIRECT
        </div>
      </div>
      <div style={{
        display:"flex",justifyContent:vertical?"center":"flex-end",
        alignItems:vertical?"flex-end":"center",flex:1,
        paddingTop:vertical?height*.49:45,
      }}>
        <div style={{width:cardWidth,maxWidth:vertical?width-90:1000}}>
          {showRafale?<RafaleCard props={props} vertical={vertical} frame={frame}/>:
            showQuestion?<QuestionCard props={props} vertical={vertical} frame={frame}/>:
            <QuoteCard props={props} vertical={vertical} frame={frame}/>}
        </div>
      </div>
      <div style={{fontFamily:font,fontSize:vertical?33:42,fontWeight:900,
        fontStyle:"italic",letterSpacing:1.5,paddingBottom:vertical?36:25}}>
        <span style={{color:lime}}>/</span> DOMINIQUE SOUCY
        <div style={{fontSize:vertical?19:23,fontWeight:700,color:"#ddd",letterSpacing:.5}}>
          EX-ATHLÈTE　/　ENTREPRENEUR　/　CITOYEN
        </div>
      </div>
    </AbsoluteFill>
    <div style={{position:"absolute",left:0,right:0,bottom:0,height:8,background:lime,
      boxShadow:`0 0 20px ${lime}`}}/>
  </AbsoluteFill>;
};
